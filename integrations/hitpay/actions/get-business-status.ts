import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input is required; the business is the one selected when the connection was authorized.');

const OutputSchema = z
    .object({
        id: z.string().describe('HitPay business ID. Example: "916c3fb5-f824-4a59-b017-7ae211e3ded6"'),
        identifier: z.string().nullish().describe('Unique handle of the business. Example: "acme"'),
        name: z.string().nullish().describe('Registered name of the business.'),
        display_name: z.string().nullish().describe('Name shown to customers on checkout pages.'),
        email: z.string().nullish().describe('Contact email of the business.'),
        country: z.string().nullish().describe('Lowercase ISO 3166-1 alpha-2 country code of the business. Example: "sg"'),
        country_name: z.string().nullish().describe('Full country name. Example: "Singapore"'),
        currency: z.string().nullish().describe('Lowercase ISO 4217 default currency of the business. Example: "sgd"'),
        currency_name: z.string().nullish().describe('Display name of the default currency. Example: "Singapore Dollar ($)"'),
        status: z.string().describe('Account status of the business as reported by HitPay. Example: "active"'),
        payment_enabled: z.boolean().describe('Whether the business can currently accept payments.'),
        website: z.string().nullish().describe('Website URL of the business.'),
        business_type: z.string().nullish().describe('Legal type of the business. Example: "company"'),
        created_at: z.string().nullish().describe('ISO 8601 timestamp when the business was created. Example: "2020-09-01T14:18:34+08:00"'),
        updated_at: z.string().nullish().describe('ISO 8601 timestamp when the business was last updated. Example: "2026-10-25T16:07:43+08:00"')
    })
    .describe('Status and profile of the connected HitPay business.');

/**
 * @tags: [read]
 * @tagReason: Reads the connected business profile from HitPay without modifying it.
 * @pitfalls: `status` can be "active" while `payment_enabled` is false (for example before verification is complete), so check `payment_enabled` before creating payment requests; a sandbox connection returns the sandbox business, not the production one.
 */
const action = createAction({
    description: 'Get the status of the connected HitPay business, including whether it can accept payments.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['business:read'],

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        // https://nango.dev/docs/api-integrations/hitpay
        const response = await nango.get({
            endpoint: '/v1/info',
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
