export function formDataToNestedObject(
   formData: FormData,
   formElement: HTMLFormElement
): Record<string, any> {
   const result: Record<string, any> = {};

   formData.forEach((value, key) => {
      const inputElement = formElement.querySelector(`[name="${key}"]`) as
         | HTMLInputElement
         | HTMLTextAreaElement
         | HTMLSelectElement
         | null;

      if (!inputElement) {
         return; // Skip if the input element is not found
      }

      // Skip fields with empty values
      if (value === "") {
         return;
      }

      const keys = key
         .replace(/\[([^\]]*)\]/g, ".$1") // Convert [key] to .key
         .split(".") // Split by dots
         .filter(Boolean); // Remove empty parts

      let current = result;

      keys.forEach((k, i) => {
         if (i === keys.length - 1) {
            let parsedValue: any = value;

            if (inputElement.type === "number") {
               parsedValue = !isNaN(Number(value)) ? Number(value) : value;
            } else if (inputElement.type === "checkbox") {
               parsedValue = "checked" in inputElement && inputElement.checked;
            }

            // Handle array or single value
            if (current[k] !== undefined) {
               if (!Array.isArray(current[k])) {
                  current[k] = [current[k]];
               }
               current[k].push(parsedValue);
            } else {
               current[k] = parsedValue;
            }
         } else {
            // Ensure the key exists as an object
            if (current[k] === undefined || typeof current[k] !== "object") {
               current[k] = {};
            }
            current = current[k];
         }
      });
   });

   return result;
}
