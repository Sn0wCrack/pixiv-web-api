import IllustType from "./IllustType";

export interface BaseResponse {
  error?: boolean;
  message?: string;
  body?: {};
}

export interface LoginResponse extends BaseResponse {
  body?: {
    validation_errors?: {
      captcha?: string;
    };
  };
}

export interface IllustDetailsResponse extends BaseResponse {
  body?: {
    illustId: string;
    illustTitle: string;
    illustComment: string;
    id: string;
    title: string;
    description: string;
    illustType: IllustType;
    createdDate: string;
    uploadDate: string;
    urls: {
      mini: string;
      thumb: string;
      small: string;
      regular: string;
      original: string;
    };
    userId: string;
    userName: string;
    userAccount: string;
    width: number;
    height: number;
    pageCount: number;
    likeCount: number;
    viewCount: number;
    isOriginal: boolean;
    extraData: {
      meta?: {};
    };
  };
}

export interface IllustPagesResponse extends BaseResponse {
  body?: Array<IllustPages>;
}

export interface IllustPages {
  urls: {
    thumb_mini: string;
    small: string;
    regular: string;
    original: string;
  };
  width: number;
  height: number;
}

export interface UgoiraMetaDataResponse extends BaseResponse {
  body?: {
    frames: Array<UgoiraFrame>;
    mime_type: string;
    originalSrc: string;
    src: string;
  };
}

export interface UgoiraFrame {
  file: string;
  delay: number;
}
