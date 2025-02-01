import type { JsonError, JsonSchema } from "json-schema-library";
import { Draft2019 } from "json-schema-library";
import { useState } from "react";
import { Form, type Validator, useFieldContext } from "../Form";

const schema = {
   type: "object",
   properties: {
      name: { type: "string" },
      age: { type: "number", minimum: 1 },
      url: { type: "string", title: "URL" },
      nested: {
         type: "object",
         properties: {
            prop: { type: "string", title: "Nested Prop" },
         },
      },
   },
   required: ["name", "age"],
};

class JsonValidator implements Validator<JsonError> {
   async validate(schema: JsonSchema, data: any) {
      return new Draft2019(schema).validate(data);
   }
}

const validator = new JsonValidator();

export default function App() {
   const [data, setData] = useState({});
   const [submitted, setSubmitted] = useState(null);

   return (
      <div className="p-10">
         <Form
            schema={schema}
            onChange={(data) => setData(data)}
            onSubmit={(data) => setSubmitted(data)}
            validator={validator}
            validationMode="change"
         >
            {({ errors, submitting, dirty, submit, reset }) => (
               <>
                  <div>
                     <b>
                        Form {dirty ? "*" : ""} (valid:{" "}
                        {errors.length === 0 ? "YES" : "NO"})
                     </b>
                  </div>
                  {errors && (
                     <ul>
                        {errors.map((error) => (
                           <li key={error.data.pointer}>{error.message}</li>
                        ))}
                     </ul>
                  )}
                  <div>
                     <input type="text" name="name" placeholder="name" />
                     <input
                        type="number"
                        name="age"
                        placeholder="age"
                        defaultValue={1}
                     />
                     {/* <input type="text" name="url" placeholder="url" /> */}
                     <Field name="url" />
                     <Field name="nested.prop" />
                  </div>
                  <div>
                     <button type="submit">submit</button>
                     <button type="button" onClick={reset}>
                        reset
                     </button>
                  </div>
               </>
            )}
         </Form>
         <h2>changed</h2>
         <pre>{JSON.stringify(data, null, 2)}</pre>
         <h2>submitted</h2>
         <pre>{JSON.stringify(submitted, null, 2)}</pre>
      </div>
   );
}

function Field({ name }: { name: string }) {
   const { schema } = useFieldContext(name);
   console.log(schema);
   return <div>{schema.type}</div>;
}
