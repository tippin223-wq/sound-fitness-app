export type PublishedContent = { id: string; bank: string; source_key: string; title: string; summary: string; revision: number; fields?: Record<string,string> };
export const publishedBanks = ['news','chyron','challenges','rewards','avatar','themes','plans','exercises','nutrition','education'] as const;
