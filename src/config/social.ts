import { social as data } from '../data';
import media from '../generated/media.json';
import { socialSchema, validateSocialImages } from '../lib/social';

export const social = socialSchema.parse(data);
validateSocialImages(social, media);
