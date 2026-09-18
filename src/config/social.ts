import data from '../data/social.json';
import media from '../generated/media.json';
import { socialSchema, validateSocialImages } from '../lib/social';

export const social = socialSchema.parse(data);
validateSocialImages(social, media);
