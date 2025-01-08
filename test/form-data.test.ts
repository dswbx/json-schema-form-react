import { describe, expect, it } from "bun:test";
import { formDataToNestedObject } from "../src/lib/form-data";

function createMockForm(
   inputs: Array<{
      name: string;
      value: string;
      type?: string;
      checked?: boolean;
   }>
) {
   const form = document.createElement("form");

   inputs.forEach((input) => {
      const el = document.createElement("input");
      el.name = input.name;
      el.value = input.value;
      if (input.type) el.type = input.type;
      if (input.checked !== undefined) el.checked = input.checked;
      form.appendChild(el);
   });

   return form;
}

describe("form-data", () => {
   it("should handle basic key-value pairs", () => {
      const form = createMockForm([
         { name: "name", value: "John" },
         { name: "age", value: "30", type: "number" },
      ]);

      const formData = new FormData(form);
      const result = formDataToNestedObject(formData, form);

      expect(result).toEqual({
         name: "John",
         age: 30,
      });
   });

   it("should handle nested objects using dot notation", () => {
      const form = createMockForm([
         { name: "user.name", value: "John" },
         { name: "user.address.street", value: "123 Main St" },
      ]);

      const formData = new FormData(form);
      const result = formDataToNestedObject(formData, form);

      expect(result).toEqual({
         user: {
            name: "John",
            address: {
               street: "123 Main St",
            },
         },
      });
   });

   it("should handle array notation", () => {
      const form = createMockForm([
         { name: "users[0].name", value: "John" },
         { name: "users[1].name", value: "Jane" },
      ]);

      const formData = new FormData(form);
      const result = formDataToNestedObject(formData, form);

      expect(result).toEqual({
         users: {
            "0": { name: "John" },
            "1": { name: "Jane" },
         },
      });
   });

   it("should handle array notation 2", () => {
      const form = createMockForm([
         { name: "users[].name", value: "John" },
         { name: "users[].name", value: "Jane" },
      ]);

      const formData = new FormData(form);
      const result = formDataToNestedObject(formData, form);

      expect(result).toEqual({
         users: {
            name: ["John", "Jane"],
         },
      });
   });

   it("should handle checkbox inputs", () => {
      const form = createMockForm([
         { name: "subscribe", value: "true", type: "checkbox", checked: true },
         { name: "terms", value: "true", type: "checkbox", checked: false },
      ]);

      const formData = new FormData(form);
      const result = formDataToNestedObject(formData, form);

      expect(result).toEqual({
         subscribe: true,
      });
   });

   it("should skip empty values", () => {
      const form = createMockForm([
         { name: "name", value: "John" },
         { name: "email", value: "" },
      ]);

      const formData = new FormData(form);
      const result = formDataToNestedObject(formData, form);

      expect(result).toEqual({
         name: "John",
      });
   });

   it("should handle deeply nested objects", () => {
      const form = createMockForm([
         { name: "user.address.street.name", value: "Main St" },
         { name: "user.address.street.number", value: "123", type: "number" },
         { name: "user.address.city", value: "Springfield" },
      ]);

      const formData = new FormData(form);
      const result = formDataToNestedObject(formData, form);

      expect(result).toEqual({
         user: {
            address: {
               street: {
                  name: "Main St",
                  number: 123,
               },
               city: "Springfield",
            },
         },
      });
   });

   it("should handle multiple checkboxes with the same name", () => {
      const form = createMockForm([
         { name: "hobbies", value: "reading", type: "checkbox", checked: true },
         { name: "hobbies", value: "gaming", type: "checkbox", checked: true },
         { name: "hobbies", value: "sports", type: "checkbox", checked: false },
      ]);

      const formData = new FormData(form);
      const result = formDataToNestedObject(formData, form);

      expect(result).toEqual({
         hobbies: [true, true],
      });
   });

   it("should handle special characters in field names", () => {
      const form = createMockForm([
         { name: "user.first-name", value: "John" },
         { name: "user.last_name", value: "Doe" },
         { name: "user.@email", value: "john@example.com" },
      ]);

      const formData = new FormData(form);
      const result = formDataToNestedObject(formData, form);

      expect(result).toEqual({
         user: {
            "first-name": "John",
            last_name: "Doe",
            "@email": "john@example.com",
         },
      });
   });
});
