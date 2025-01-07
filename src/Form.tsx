import {
   type Draft,
   Draft04,
   Draft06,
   Draft07,
   Draft2019,
   type DraftConfig,
   type JsonError,
   type JsonSchema
} from "json-schema-library";
import {
   type ComponentPropsWithoutRef,
   type ReactNode,
   type RefObject,
   forwardRef,
   useEffect,
   useImperativeHandle,
   useRef,
   useState
} from "react";
import { formDataToNestedObject } from "./lib/form-data";

const DRAFTS = { Draft04, Draft06, Draft07, Draft2019 } as const;
const DEFAULT_DRAFT = "Draft07" as const;
const cache = new Map<string, JsonSchema>();

export type RenderProps = {
   errors: JsonError[];
   schema: JsonSchema;
   submitting: boolean;
   dirty: boolean;
   submit: () => Promise<void>;
   reset: () => void;
};

export type ChangeSet = { name: string; value: any };

export type FormProps<FormData = any> = Omit<
   ComponentPropsWithoutRef<"form">,
   "onSubmit" | "onChange" | "children"
> & {
   schema: `http${string}` | `/${string}` | JsonSchema;
   draft?: keyof typeof DRAFTS;
   draftConfig?: DraftConfig;
   children: (props: RenderProps) => ReactNode;
   onChange?: (formData: FormData, changed: ChangeSet) => void | Promise<void>;
   onSubmit?: (formData: FormData) => void | Promise<void>;
   onSubmitInvalid?: (errors: JsonError[], formData: FormData) => void | Promise<void>;
   resetOnSubmit?: boolean;
   revalidateOnError?: boolean;
   hiddenSubmit?: boolean;
};

export type FormRef = {
   submit: () => Promise<void>;
   validate: () => Promise<{ data: any; errors: JsonError[] }>;
   reset: () => void;
   resetDirty: () => void;
   formRef: RefObject<HTMLFormElement | null>;
};

export const Form = forwardRef<FormRef, FormProps>(
   (
      {
         schema: initialSchema,
         draft = DEFAULT_DRAFT,
         draftConfig,
         children,
         onChange,
         onSubmit,
         onSubmitInvalid,
         resetOnSubmit,
         revalidateOnError = true,
         hiddenSubmit,
         ...formProps
      },
      ref
   ) => {
      const is_schema = typeof initialSchema !== "string";
      const [submitting, setSubmitting] = useState(false);
      const [lib, setLib] = useState<Draft | undefined>(
         is_schema ? new DRAFTS[draft](initialSchema, draftConfig) : undefined
      );
      const [errors, setErrors] = useState<JsonError[]>([]);
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
            if (typeof initialSchema === "string") {
               if (cache.has(initialSchema)) {
                  setLib(new DRAFTS[draft](cache.get(initialSchema) as JsonSchema, draftConfig));
                  return;
               }

               const res = await fetch(initialSchema);

               if (res.ok) {
                  const s = (await res.json()) as JsonSchema;
                  setLib(new DRAFTS[draft](s, draftConfig));
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

         if (revalidateOnError && errors.length > 0) {
            await validate();
         }
      }

      async function validate() {
         const form = formRef.current;
         if (!form || !lib) return { data: {} as FormData, errors: [] as JsonError[] };

         const formData = new FormData(form);
         const data = formDataToNestedObject(formData, form) as FormData;

         const errors = lib.validate(data);
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
         if (!form || !lib) return;

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

      // @todo: conditional type, if string given, then potentially undefined
      const schema = lib?.getSchema() ?? ({} as JsonSchema);

      return (
         <form {...formProps} onSubmit={handleSubmit} ref={formRef} onChange={handleChangeEvent}>
            {children({
               schema,
               submit,
               dirty,
               reset,
               submitting,
               errors: errors.length > 0 ? errors : []
            })}

            {hiddenSubmit && <input type="submit" style={{ visibility: "hidden" }} />}
         </form>
      );
   }
);
