import { type JsonSchema } from "json-schema-library";
import {
   type ComponentPropsWithoutRef,
   type ForwardedRef,
   type ReactNode,
   type RefObject,
   forwardRef,
   useEffect,
   useImperativeHandle,
   useRef,
   useState
} from "react";
import { formDataToNestedObject } from "./lib/form-data";

const cache = new Map<string, JsonSchema>();

export type ChangeSet = { name: string; value: any };
export type ValidationFn<FormData = any, Err = unknown> = (
   schema: JsonSchema,
   data: FormData
) => Promise<Err[]> | Err[];

export type FormRenderProps<Err> = {
   errors: Err[];
   schema: JsonSchema;
   submitting: boolean;
   dirty: boolean;
   submit: () => Promise<void>;
   reset: () => void;
   resetDirty: () => void;
};

export type FormRef<FormData, Err> = {
   submit: () => Promise<void>;
   validate: () => Promise<{ data: FormData; errors: Err[] }>;
   reset: () => void;
   resetDirty: () => void;
   formRef: RefObject<HTMLFormElement | null>;
};

export type FormProps<FormData, ValFn, Err> = Omit<
   ComponentPropsWithoutRef<"form">,
   "onSubmit" | "onChange" | "children"
> & {
   schema: `http${string}` | `/${string}` | JsonSchema;
   validate: ValidationFn<FormData, Err>;
   validationMode?: "submit" | "change";
   children: (props: FormRenderProps<Err>) => ReactNode;
   onChange?: (formData: FormData, changed: ChangeSet) => void | Promise<void>;
   onSubmit?: (formData: FormData) => void | Promise<void>;
   onSubmitInvalid?: (errors: Err[], formData: FormData) => void | Promise<void>;
   resetOnSubmit?: boolean;
   revalidateOnError?: boolean;
   hiddenSubmit?: boolean;
};

const FormComponent = <FormData, ValFn, Err>(
   {
      schema: initialSchema,
      validate: validateFn,
      validationMode = "submit",
      children,
      onChange,
      onSubmit,
      onSubmitInvalid,
      resetOnSubmit,
      revalidateOnError = true,
      hiddenSubmit,
      ...formProps
   }: FormProps<FormData, ValFn, Err>,
   ref: ForwardedRef<FormRef<FormData, Err>>
) => {
   const is_schema = typeof initialSchema !== "string";
   const [schema, setSchema] = useState<JsonSchema | undefined>(
      is_schema ? initialSchema : undefined
   );
   const [submitting, setSubmitting] = useState(false);
   const [errors, setErrors] = useState<any[]>([]);
   const [dirty, setDirty] = useState(false);
   const formRef = useRef<HTMLFormElement | null>(null);

   function resetDirty() {
      setDirty(false);
   }

   useImperativeHandle(ref, () => ({
      submit: submit,
      validate: validate,
      reset: reset,
      resetDirty,
      formRef
   }));

   useEffect(() => {
      (async () => {
         if (!is_schema) {
            if (cache.has(initialSchema)) {
               setSchema(cache.get(initialSchema));
               return;
            }

            const res = await fetch(initialSchema);

            if (res.ok) {
               const s = (await res.json()) as JsonSchema;
               setSchema(s);
               cache.set(initialSchema, s);
            }
         }
      })();
   }, [initialSchema]);

   async function handleChangeEvent(e: React.FormEvent<HTMLFormElement>) {
      const form = formRef.current;
      if (!form) return;
      setDirty(true);
      const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;

      if (!target || !form.contains(target)) {
         return; // Ignore events from outside the form
      }

      const name = target.name;
      const formData = new FormData(form);
      const data = formDataToNestedObject(formData, form) as FormData;
      const value = formData.get(name);

      await onChange?.(data, { name, value });

      if ((revalidateOnError && errors.length > 0) || validationMode === "change") {
         await validate();
      }
   }

   async function validate() {
      const form = formRef.current;
      if (!form || !schema) return { data: {} as FormData, errors: [] };

      const formData = new FormData(form);
      const data = formDataToNestedObject(formData, form) as FormData;

      const errors = await validateFn(schema, data);
      setErrors(errors);
      return { data, errors };
   }

   async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      await submit();
      return false;
   }

   async function submit() {
      const form = formRef.current;
      if (!form || !schema) {
         console.log("invalid", { form, schema });
         return;
      }

      const { data, errors } = await validate();
      if (errors.length > 0) {
         await onSubmitInvalid?.(errors, data);
      } else {
         setSubmitting(true);
         try {
            await onSubmit?.(data);
            if (resetOnSubmit) {
               reset();
            }
         } catch (e) {
            console.error(e);
            console.warn("You should wrap your submit handler in a try/catch block");
         } finally {
            setSubmitting(false);
            setDirty(false);
         }
      }
   }

   function reset() {
      formRef.current?.reset();
      setErrors([]);
   }

   return (
      <form {...formProps} onSubmit={handleSubmit} ref={formRef} onChange={handleChangeEvent}>
         {children({
            schema: schema as any,
            submit,
            dirty,
            reset,
            resetDirty,
            submitting,
            errors: errors.length > 0 ? errors : []
         })}

         {hiddenSubmit && <input type="submit" style={{ visibility: "hidden" }} />}
      </form>
   );
};

export const Form = forwardRef(FormComponent) as <
   FormData = any,
   ValFn = ValidationFn,
   Err = ValFn extends ValidationFn<FormData, infer E> ? Awaited<E> : never
>(
   props: FormProps<FormData, ValFn, Err> & {
      ref?: ForwardedRef<HTMLFormElement>;
   }
) => ReturnType<typeof FormComponent>;
