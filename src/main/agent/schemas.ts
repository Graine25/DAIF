import { z } from 'zod';

export const listFunctionsInputSchema = z
  .object({
    offset: z.number().int().min(0).default(0),
    count: z.number().int().positive().max(512).default(128)
  })
  .describe('Parameters used to page through IDA functions.');

export const fetchFunctionInputSchema = z
  .object({
    ea: z.string().min(1, 'Function address is required')
  })
  .describe('Fetch disassembly, pseudocode, and cross-references for a function.');

export const annotateFunctionInputSchema = z
  .object({
    ea: z.string().min(1, 'Function address is required'),
    name: z.string().trim().min(1).optional(),
    prototype: z.string().trim().min(1).optional(),
    comments: z.array(z.string().trim().min(1)).optional()
  })
  .describe('Persist human/LLM annotations to IDA.');

export const summarizeAndPlaceInputSchema = z
  .object({
    ea: z.string().min(1, 'Function address is required'),
    summary: z.string().trim().min(1, 'Provide a semantic summary'),
    inputs: z.array(z.string().trim()).default([]),
    outputs: z.array(z.string().trim()).default([]),
    concerns: z.array(z.string().trim()).default([]),
    suggestedFile: z.string().trim().optional(),
    confidence: z.number().min(0).max(1).nullable().optional()
  })
  .describe('Summarize function semantics and propose a placement grouping.');

export type ListFunctionsInput = z.infer<typeof listFunctionsInputSchema>;
export type FetchFunctionInput = z.infer<typeof fetchFunctionInputSchema>;
export type AnnotateFunctionInput = z.infer<typeof annotateFunctionInputSchema>;
export type SummarizeAndPlaceInput = z.infer<typeof summarizeAndPlaceInputSchema>;
