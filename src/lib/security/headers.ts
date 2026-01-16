import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Configuration des en-têtes de sécurité
export const securityHeaders = {
  // Content Security Policy - Prévention XSS
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live", // 'unsafe-eval' requis pour Next.js dev
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' ws: wss:", // WebSocket support
    "frame-ancestors 'none'", // Prévention clickjacking
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),

  // Prévenir le MIME-sniffing
  'X-Content-Type-Options': 'nosniff',

  // Mode de compatibilité IE
  'X-UA-Compatible': 'IE=edge',

  // Prévenir le clickjacking
  'X-Frame-Options': 'DENY',

  // Activer XSS Protection (legacy mais encore utile)
  'X-XSS-Protection': '1; mode=block',

  // Politique de référent
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy (remplace Feature Policy)
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
  ].join(', '),

  // HSTS (uniquement en production HTTPS)
  ...(process.env.NODE_ENV === 'production' ? {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  } : {}),

  // Cache control pour les réponses API
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// Middleware pour appliquer les en-têtes de sécurité
export function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// Wrapper pour les API routes
export function withSecurityHeaders(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const response = await handler(req);
    return addSecurityHeaders(response);
  };
}

// En-têtes spécifiques pour les fichiers statiques
export const staticFileHeaders = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  'X-Content-Type-Options': 'nosniff',
};

// En-têtes pour les téléchargements de fichiers
export const downloadHeaders = {
  'Content-Disposition': 'attachment; filename="export.pdf"',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// Validation des origins pour les requêtes API
export function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  
  // En développement, être plus permissif
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  
  // Vérifier l'origin
  if (origin && !allowedOrigins.includes(origin)) {
    return false;
  }
  
  // Vérifier le referer si pas d'origin
  if (!origin && referer) {
    const refererOrigin = new URL(referer).origin;
    return allowedOrigins.includes(refererOrigin);
  }
  
  return true;
}

// Rate limiting simple par IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimitByIP(
  req: NextRequest,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; resetTime?: number } {
  const ip = req.headers.get('x-forwarded-for') || 
           req.headers.get('x-real-ip') || 
           req.headers.get('cf-connecting-ip') || 
           'unknown';
  
  const now = Date.now();
  const key = `rate_limit:${ip}`;
  
  const existing = rateLimitMap.get(key);
  
  if (!existing || now > existing.resetTime) {
    // Nouvelle fenêtre ou fenêtre expirée
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true };
  }
  
  if (existing.count >= maxRequests) {
    return { 
      allowed: false, 
      resetTime: existing.resetTime 
    };
  }
  
  existing.count++;
  return { allowed: true };
}

// Nettoyage périodique de la map de rate limiting
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 300000); // Nettoyer toutes les 5 minutes
}
