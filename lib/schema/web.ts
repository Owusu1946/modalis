import { z } from 'zod'

// Basic schema describing a simple web project request
// The model can fill these fields when invoking the tool.
export const webSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(80)
    .optional()
    .describe('Optional project title for the website.'),
  description: z
    .string()
    .max(300)
    .optional()
    .describe('Short description to include in the page.'),
  include_js: z
    .boolean()
    .optional()
    .describe('Whether to include a starter script.js file (default true).'),
  template: z
    .enum(['blank', 'landing', 'portfolio'])
    .optional()
    .describe('Starter template for layout. Default is blank.')
})

export type WebSchema = typeof webSchema
