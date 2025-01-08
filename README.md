# json-schema-form-react

A tiny (4.5kb minified, 1.6kb gzipped) dependency-free json schema form library for react to validate `FormData` against a JSON Schema. 

## Motivation
There are several libraries helping with JSON Schema and forms, but most focus on autogenerating them. While this is very handy at first, you'll find yourself digging deep into the documentation to customize the generated forms. On the other hand, there are libraries for form management, each with its very own API to learn.

This library aims to be a minimal abstraction between native browser forms and JSON schema. In addition, it doesn't assume or require deep understanding of validation libraries, it's very easy to use any JSON schema validator. Create a class with a `validate` function that takes in the schema and form data, returning the error schema (and inferring the type correctly) that library provides – no transformation needed.

## Installation

```bash
npm install json-schema-form-react
```

## Usage
Here is a minimal example to get it running using `json-schema-library` as the validator (you can use any):

```tsx
import type { JsonError, JsonSchema } from "json-schema-library";
import { Draft2019 } from "json-schema-library";
import { Form, type Validator } from "json-schema-form-react"; 

// using json-schema-library, but could be any
class JsonValidator implements Validator<JsonError> {
   async validate(schema: JsonSchema, data: any) {
      return new Draft2019(schema).validate(data);
   }
}
const validator = new JsonValidator();

const schema = {
   type: "object",
   properties: {
      name: { type: "string" },
      age: { type: "number", minimum: 1 },
   },
   required: ["name"]
} satisfies JsonSchema;

export default function App() {
   return (
      <Form
         schema={schema}
         onChange={console.log}
         onSubmit={console.log}
         validator={validator}
         validationMode="change"
      >
         {({ errors, dirty, reset }) => (
            <>
               <div>
                  <b>
                     Form {dirty ? "*" : ""} (valid: {errors.length === 0 ? "valid" : "invalid"})
                  </b>
               </div>
               <div>
                  <input type="text" name="name" />
                  <input type="number" name="age" />
               </div>
               <div>
                  <button type="submit">submit</button>
                  <button type="button" onClick={reset}>reset</button>
               </div>
            </>
         )}
      </Form>
   )
}
```

## Todos
It's very early, there are some functionalities planned:
- [ ] add an error map to identify the erroring field easily
- [ ] add a complementary library to automatically generate the form, with the freedom of modifying the layout and props inline
- [ ] more examples for various validation and UI libraries
