/**
 * JSON-Schema für Event-Extraktion
 * Entspricht dem Event-Interface (ohne id, createdAt, updatedAt)
 * Diese werden im EventNormalizer hinzugefügt
 */
export const EVENT_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          location: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              latitude: { type: 'number' },
              longitude: { type: 'number' },
            },
            required: ['address'],
          },
          dailyTimeSlots: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
                from: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
                to: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
              },
              required: ['date'],
            },
          },
          price: { type: ['number', 'null'] },
          priceString: { type: 'string' },
          categoryId: { type: 'string' },
          website: { type: 'string' },
          contactEmail: { type: 'string' },
          contactPhone: { type: 'string' },
          socialMedia: {
            type: 'object',
            properties: {
              instagram: { type: 'string' },
              facebook: { type: 'string' },
              tiktok: { type: 'string' },
            },
          },
          ticketsNeeded: { type: 'boolean' },
          monthYear: { type: 'string', pattern: '^\\d{2}\\.\\d{4}$' },
        },
        required: ['title', 'location', 'categoryId'],
      },
    },
  },
  required: ['events'],
};
