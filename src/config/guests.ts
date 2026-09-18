import data from '../data/guests.json';
import { guestsSchema } from '../lib/guests';

export const guests = guestsSchema.parse(data);
