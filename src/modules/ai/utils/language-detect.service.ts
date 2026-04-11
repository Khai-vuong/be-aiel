import { Injectable } from "@nestjs/common";
import { franc } from "franc";

@Injectable()
export class LanguageDetectionService {
  detect(text: string): string {
    const lang = franc(text, { minLength: 3 });
    return (lang === 'vie' || lang === 'eng') ? lang : 'other';
  }
}