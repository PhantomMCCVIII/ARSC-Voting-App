const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'server/routes.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Replace the ZodError import with z.ZodError
const updated = content
  .replace(/import \{ z \} from "zod";\nimport \{ fromZodError \} from "zod-validation-error";/g, 
           'import { z } from "zod";\nimport { fromZodError } from "zod-validation-error";')
  .replace(/if \(error instanceof ZodError\) \{/g, 
           'if (error instanceof z.ZodError) {')
  .replace(/return res\.status\(400\)\.json\(\{ message: error\.message \}\);/g,
           'return res.status(400).json({ message: fromZodError(error).message });');

fs.writeFileSync(filePath, updated);
console.log('File updated successfully');
