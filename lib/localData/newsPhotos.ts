import photos from "../../public/news/article-photos.json";

export type NewsPhotoCredit = { author: string; sourceUrl: string; license: string; licenseUrl: string };
type ArticlePhoto = { image: string; alt: string; credit: string; sourceUrl: string; license: string; licenseUrl: string };
const articlePhotos: Record<string, ArticlePhoto> = photos;
export function newsArticlePhoto(id: string) { return articlePhotos[id]; }
export function newsPhotoCredit(photo: ArticlePhoto): NewsPhotoCredit {
  return { author: photo.credit, sourceUrl: photo.sourceUrl, license: photo.license, licenseUrl: photo.licenseUrl.replace(/^http:/, "https:") };
}
