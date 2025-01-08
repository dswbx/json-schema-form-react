export type JSONSchemaTypeName =
   | "string"
   | "number"
   | "integer"
   | "boolean"
   | "object"
   | "array"
   | "null"
   | string;

export type JSONSchemaDefinition = JSONSchema | boolean;

export interface JSONSchema {
   $id?: string;
   $ref?: string;
   $schema?: string;
   title?: string;
   description?: string;
   default?: any;

   // Data types
   type?: JSONSchemaTypeName | JSONSchemaTypeName[];
   enum?: any[];
   const?: any;

   // Numbers
   multipleOf?: number;
   maximum?: number;
   exclusiveMaximum?: number;
   minimum?: number;
   exclusiveMinimum?: number;

   // Strings
   maxLength?: number;
   minLength?: number;
   pattern?: string;
   format?: string;

   // Arrays
   items?: JSONSchemaDefinition | JSONSchemaDefinition[];
   additionalItems?: JSONSchemaDefinition;
   uniqueItems?: boolean;
   maxItems?: number;
   minItems?: number;

   // Objects
   properties?: { [key: string]: JSONSchemaDefinition };
   patternProperties?: { [key: string]: JSONSchemaDefinition };
   additionalProperties?: JSONSchemaDefinition;
   required?: string[];
   maxProperties?: number;
   minProperties?: number;
   dependencies?: { [key: string]: JSONSchemaDefinition | string[] };

   // Combining schemas
   allOf?: JSONSchemaDefinition[];
   anyOf?: JSONSchemaDefinition[];
   oneOf?: JSONSchemaDefinition[];
   not?: JSONSchemaDefinition;
   if?: JSONSchemaDefinition;
   then?: JSONSchemaDefinition;
   else?: JSONSchemaDefinition;

   // Definitions
   definitions?: { [key: string]: JSONSchemaDefinition };
   $comment?: string;
   [key: string]: any; // catch-all for custom extensions
}
