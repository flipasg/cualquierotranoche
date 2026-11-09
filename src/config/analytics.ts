import data from '../data/analytics.json';
import { analyticsSchema } from '../lib/analytics';

export const analytics = analyticsSchema.parse(data);
