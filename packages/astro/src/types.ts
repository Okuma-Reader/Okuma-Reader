export interface OkumaReaderProps {
  bookId: string;
  title: string;
  subtitle?: string;
  coverImageUrl: string;
  darkColor: string;
  lightColor: string;
  backHref: string;
  downloadUrl?: string;
  downloadFilename?: string;
  ownPage?: boolean;
}
