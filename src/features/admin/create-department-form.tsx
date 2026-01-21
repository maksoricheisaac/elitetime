"use client";

import type { FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createDepartmentFormSchema, type CreateDepartmentFormValues } from "@/schemas/admin/forms/departments";


interface CreateDepartmentFormProps {
  action: (formData: FormData) => void | Promise<void>;
}

export function CreateDepartmentForm({ action }: CreateDepartmentFormProps) {
  const form = useForm<CreateDepartmentFormValues>({
    resolver: zodResolver(createDepartmentFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
    mode: "onSubmit",
  });

  const handleValidatedSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget as HTMLFormElement;
    void form.handleSubmit(() => {
      formElement.submit();
    })(event);
  };

  return (
    <Form {...form}>
      <form action={action} className="space-y-4" noValidate onSubmit={handleValidatedSubmit}>
        <div className="space-y-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom du département</FormLabel>
                <FormControl>
                  <Input
                    id="new-department-name"
                    placeholder="Ex: Informatique, Ressources humaines..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="space-y-2">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description du département</FormLabel>
                <FormControl>
                  <Input
                    id="new-department-description"
                    placeholder="Description courte du département (optionnel)"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Créer
          </Button>
        </div>
      </form>
    </Form>
  );
}
