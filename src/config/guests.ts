import { guests as data } from '../data';
import { guestsSchema } from '../lib/guests';

export const guests = guestsSchema.parse(data);
