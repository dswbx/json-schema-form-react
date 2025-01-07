import { useState } from "react";
import { Form } from "../Form";

const schema = {
   type: "object",
   properties: {
      name: { type: "string" },
      url: { type: "string" }
   },
   required: ["name"]
};

export default function App() {
   const [data, setData] = useState({});
   const [submitted, setSubmitted] = useState(null);

   return (
      <div className="p-10">
         <Form
            schema={schema}
            onChange={(data) => setData(data)}
            onSubmit={(data) => setSubmitted(data)}
            hiddenSubmit
         >
            {({ errors, submitting, dirty, submit, reset }) => (
               <>
                  <div>
                     <b>Form {dirty ? "*" : ""}</b>
                  </div>
                  <div>
                     <input type="text" name="name" placeholder="name" onChange={console.log} />
                     <input type="text" name="url" placeholder="url" />
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
