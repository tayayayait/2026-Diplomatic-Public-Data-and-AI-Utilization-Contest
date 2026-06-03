const PLACES_PHOTO_BASE_URL = "https://places.googleapis.com/v1";

/**
 * Google Places API?먯꽌 媛?몄삩 photoName???대?吏 URL濡?蹂?섑빀?덈떎.
 * Places API??photo??"places/PLACE_ID/photos/PHOTO_REFERENCE" ?뺥깭??name??媛吏묐땲??
 *
 * ??URL? ?대씪?댁뼵?몃줈 ?꾩넚?섏뼱 釉뚮씪?곗??먯꽌 吏곸젒 ?대?吏瑜??뚮뜑留곹븯?????ъ슜?섎?濡? * API ?ㅺ? ?몄텧?????덉뒿?덈떎. ?곕씪???ㅼ젣 ?꾨줈?뺤뀡?먯꽌???쒕쾭 ?ъ씠???대?吏 ?꾨줉???쇱슦?몃?
 * 援ы쁽?섎뒗 寃껋씠 ???덉쟾?⑸땲??
 *
 * @param photoName API ?묐떟?쇰줈 諛쏆? photos[0].name
 * @param maxWidthPx 媛?몄삱 理쒕? ?덈퉬 (湲곕낯 400px, ?몃꽕???⑸룄)
 * @param apiKey Google Places API ?? */
export const resolvePhotoUrl = (
  photoName?: string,
  maxWidthPx: number = 400,
  apiKey?: string,
): string | undefined => {
  if (!photoName || !apiKey) {
    return undefined;
  }

  // URL 援ъ꽦: https://places.googleapis.com/v1/{photoName}/media?maxHeightPx=400&maxWidthPx=400&key=API_KEY
  // @see https://developers.google.com/maps/documentation/places/web-service/photos?hl=ko
  const url = new URL(`${PLACES_PHOTO_BASE_URL}/${photoName}/media`);
  url.searchParams.set("maxWidthPx", maxWidthPx.toString());
  url.searchParams.set("maxHeightPx", maxWidthPx.toString()); // 鍮꾩쑉 ?좎?瑜??꾪빐 max ?숈씪?섍쾶 ?ㅼ젙
  url.searchParams.set("key", apiKey);

  return url.toString();
};
