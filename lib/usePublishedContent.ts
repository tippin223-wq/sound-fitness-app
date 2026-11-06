"use client";
import { useEffect, useState } from "react";
import type { PublishedContent } from "./contentPublished";
const cached=new Map<string,{at:number;items:PublishedContent[]}>();
const pending=new Map<string,Promise<PublishedContent[]>>();
export async function fetchPublishedContent(bank:string,source?:string,page=0) {
 const key=`${bank}:${source??''}:${page}`;
 const old=cached.get(key);
 if(old&&Date.now()-old.at<60000)return old.items;
 if(pending.has(key))return pending.get(key)!;
 const request=fetch(`/api/content?${new URLSearchParams({bank,page:String(page),...(source?{source}:{})})}`).then(async response=>{
  if(!response.ok)throw Error('Published content could not be loaded');
  const items=await response.json() as PublishedContent[];
  cached.set(key,{at:Date.now(),items});return items;
 }).finally(()=>pending.delete(key));
 pending.set(key,request);return request;
}
export function usePublishedContent(bank:string,enabled=true) {
 const [items,setItems]=useState<PublishedContent[]>([]);
 useEffect(()=>{if(!enabled)return;let active=true;void fetchPublishedContent(bank).then(next=>{if(active)setItems(next);}).catch(()=>{});return()=>{active=false;};},[bank,enabled]);
 return items;
}
export function usePublishedEntry(bank:string,source:string,enabled=true){
 const [entry,setEntry]=useState<PublishedContent|null>(null);
 useEffect(()=>{if(!enabled)return;let active=true;void fetchPublishedContent(bank,source).then(items=>{if(active)setEntry(items[0]??null);}).catch(()=>{});return()=>{active=false;};},[bank,source,enabled]);
 return entry?.source_key===source?entry:null;
}
