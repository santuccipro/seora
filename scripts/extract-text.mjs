import { readFile, writeFile } from "node:fs/promises";
import mammoth from "mammoth";
const buf = await readFile("/tmp/esteban_pdf2docx.docx");
const { value } = await mammoth.extractRawText({ buffer: buf });
await writeFile("/tmp/esteban_text.txt", value);
console.log(value.length);
