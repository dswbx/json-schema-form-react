import {
   type ComponentPropsWithoutRef,
   type ForwardedRef,
   type ReactNode,
   type RefObject,
   createContext,
   forwardRef,
   useContext,
   useEffect,
   useImperativeHandle,
   useRef,
   useState,
} from "react";
import { formDataToNestedObject } from "./lib/form-data";
import type { JSONSchema } from "./types";

const cache = new Map<string, JSONSchema>();

export type ChangeSet = { name: string; value: any };

export type Validator<Err = unknown, FormData = any> = {
   validate: (
      schema: JSONSchema | any,
      data: FormData
   ) => Promise<Err[]> | Err[];
};

export type FormRenderProps<Err> = {
   errors: Err[];
   schema: JSONSchema;
   submitting: boolean;
   dirty: boolean;
   submit: () => Promise<void>;
   reset: () => void;
   resetDirty: () => void;
};

const FormContext = createContext<FormRenderProps<any>>(undefined!);

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
   schema: `http${string}` | `/${string}` | JSONSchema;
   validator: Validator<Err, FormData>;
   validationMode?: "submit" | "change";
   children: (props: FormRenderProps<Err>) => ReactNode;
   onChange?: (formData: FormData, changed: ChangeSet) => void | Promise<void>;
   onSubmit?: (formData: FormData) => void | Promise<void>;
   onSubmitInvalid?: (
      errors: Err[],
      formData: FormData
   ) => void | Promise<void>;
   resetOnSubmit?: boolean;
   revalidateOnError?: boolean;
   hiddenSubmit?: boolean;
};

const FormComponent = <FormData, ValFn, Err>(
   {
      schema: initialSchema,
      validator,
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
   const [schema, setSchema] = useState<JSONSchema | undefined>(
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
      formRef,
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
               const s = (await res.json()) as JSONSchema;
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
      const target = e.target as
         | HTMLInputElement
         | HTMLSelectElement
         | HTMLTextAreaElement
         | null;

      if (!target || !form.contains(target)) {
         return; // Ignore events from outside the form
      }

      const name = target.name;
      const formData = new FormData(form);
      const data = formDataToNestedObject(formData, form) as FormData;
      const value = formData.get(name);

      await onChange?.(data, { name, value });

      if (
         (revalidateOnError && errors.length > 0) ||
         validationMode === "change"
      ) {
         await validate();
      }
   }

   async function validate() {
      const form = formRef.current;
      if (!form || !schema) return { data: {} as FormData, errors: [] };

      const formData = new FormData(form);
      const data = formDataToNestedObject(formData, form) as FormData;

      const errors = await validator.validate(schema, data);
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
            if (onSubmit) {
               await onSubmit?.(data);
               if (resetOnSubmit) {
                  reset();
               }
            } else {
               form.submit();
            }
         } catch (e) {
            console.error(e);
            console.warn(
               "You should wrap your submit handler in a try/catch block"
            );
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

   const context = {
      schema: schema as any,
      submit,
      dirty,
      reset,
      resetDirty,
      submitting,
      errors,
   };

   return (
      <form
         {...formProps}
         onSubmit={handleSubmit}
         ref={formRef}
         onChange={handleChangeEvent}
      >
         <FormContext.Provider value={context}>
            {children(context)}
         </FormContext.Provider>

         {hiddenSubmit && (
            <input
               type="submit"
               style={{ visibility: "hidden" }}
               disabled={errors.length > 0}
            />
         )}
      </form>
   );
};

export function useFormContext() {
   const context = useContext(FormContext);
   if (!context) {
      throw new Error("useFormContext() must be used within a Form component");
   }
   return context;
}

export function useFieldContext(name: string) {
   const context = useFormContext();
   const path = name.includes(".") ? name.split(".") : [name];
   const subschema = path.reduce((schema, key) => {
      return schema.properties?.[key] as JSONSchema;
   }, context.schema);
   return {
      schema: subschema,
   };
}

export const Form = forwardRef(FormComponent) as <
   FormData = any,
   ValidatorActual = Validator,
   Err = ValidatorActual extends Validator<infer E, FormData>
      ? Awaited<E>
      : never
>(
   props: FormProps<FormData, ValidatorActual, Err> & {
      ref?: ForwardedRef<HTMLFormElement>;
   }
) => ReturnType<typeof FormComponent>;
