import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        amount: z.number().positive().describe('Amount to charge, in the major unit of the currency. Example: 25.5'),
        currency: z
            .string()
            .regex(/^[A-Za-z]{3}$/, 'currency must be a three-letter ISO 4217 code.')
            .describe('ISO 4217 currency code of the payment. Example: "SGD"'),
        payment_methods: z
            .array(z.string())
            .optional()
            .describe('Payment methods to offer on the checkout page. Omit to offer every method enabled on the business. Example: ["paynow_online", "card"]'),
        email: z.string().optional().describe('Email of the buyer. Example: "buyer@example.com"'),
        name: z.string().optional().describe('Name of the buyer. Example: "John Doe"'),
        purpose: z.string().optional().describe('Purpose of the payment, shown to the buyer. Example: "Order #1234"'),
        reference_number: z.string().optional().describe('Your own reference for the payment; the buyer cannot edit it. Example: "ORDER-1234"'),
        redirect_url: z
            .string()
            .optional()
            .describe('URL the buyer is sent to after paying. HitPay appends the payment request ID and status as query parameters.'),
        allow_repeated_payments: z.boolean().optional().describe('Whether the payment link can be paid more than once. Defaults to false.'),
        expiry_date: z
            .string()
            .optional()
            .describe('When the payment link expires, as "YYYY-MM-DD HH:mm:ss" in Singapore time (SGT). Example: "2026-12-31 23:59:59"')
    })
    .describe('Details of the payment request to create.');

const OutputSchema = z
    .object({
        id: z.string().describe('HitPay payment request ID. Example: "9741164c-06a2-4d5d-a8d5-c2f1a3a0d5f4"'),
        url: z.string().describe('Hosted checkout URL to send the buyer to.'),
        status: z.string().describe('Status of the payment request. Newly created requests are "pending".'),
        amount: z.string().describe('Amount as a decimal string with two decimals. Example: "25.50"'),
        currency: z.string().describe('Currency code of the payment request. Example: "sgd"'),
        name: z.string().nullish().describe('Name of the buyer.'),
        email: z.string().nullish().describe('Email of the buyer.'),
        phone: z.string().nullish().describe('Phone number of the buyer.'),
        purpose: z.string().nullish().describe('Purpose of the payment.'),
        reference_number: z.string().nullish().describe('Your own reference for the payment.'),
        payment_methods: z.array(z.string()).nullish().describe('Payment methods offered on the checkout page.'),
        redirect_url: z.string().nullish().describe('URL the buyer is sent to after paying.'),
        allow_repeated_payments: z.boolean().nullish().describe('Whether the payment link can be paid more than once.'),
        expiry_date: z.string().nullish().describe('When the payment link expires.'),
        created_at: z.string().nullish().describe('Timestamp when the payment request was created.'),
        updated_at: z.string().nullish().describe('Timestamp when the payment request was last updated.')
    })
    .describe('The payment request created in HitPay.');

/**
 * @tags: [write]
 * @tagReason: Creates a new payment request in HitPay, which is a provider mutation.
 * @pitfalls: Creating a payment request is not idempotent, so the request is not retried and a failed call may still have created a request; check `payment_enabled` with get-business-status first, because a business that cannot accept payments is rejected; payment status changes are delivered by webhooks configured in the HitPay dashboard, not by this action.
 */
const action = createAction({
    description: 'Create a HitPay payment request and return its hosted checkout URL.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['payments:create'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.hitpayapp.com/apis/guide/online-payments
            endpoint: '/v1/payment-requests',
            data: {
                amount: input.amount,
                currency: input.currency,
                ...(input.payment_methods !== undefined && { payment_methods: input.payment_methods }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.purpose !== undefined && { purpose: input.purpose }),
                ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
                ...(input.redirect_url !== undefined && { redirect_url: input.redirect_url }),
                ...(input.allow_repeated_payments !== undefined && { allow_repeated_payments: input.allow_repeated_payments }),
                ...(input.expiry_date !== undefined && { expiry_date: input.expiry_date })
            },
            // Creating a payment request is not idempotent; a retry after a lost response would create a duplicate request.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
