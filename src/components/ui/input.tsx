import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";
import { Field, fieldBase } from "./field";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, id, required, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    return (
      <Field
        label={label}
        hint={hint}
        error={error}
        required={required}
        htmlFor={inputId}
        errorId={errorId}
      >
        <input
          ref={ref}
          id={inputId}
          required={required}
          // Le champ en erreur doit le DIRE, pas seulement rougir : sans ces
          // deux attributs, un lecteur d'écran passe sur le message sans le
          // rattacher au champ fautif. `Select` les posait déjà, pas `Input`.
          aria-invalid={error ? true : undefined}
          aria-errormessage={error ? errorId : undefined}
          className={cn(
            fieldBase,
            error && "border-error focus:border-error focus:ring-error",
            className,
          )}
          {...props}
        />
      </Field>
    );
  },
);
Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className, id, required, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <Field label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
        <textarea
          ref={ref}
          id={inputId}
          required={required}
          className={cn(fieldBase, "min-h-24 resize-y", error && "border-error", className)}
          {...props}
        />
      </Field>
    );
  },
);
Textarea.displayName = "Textarea";
