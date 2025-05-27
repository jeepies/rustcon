export interface Response {
  id: number;
  type: ResponseType;
  body: string;
}

enum ResponseType {
  SERVERDATA_RESPONSE_VALUE = 0,
  SERVERDATA_AUTH_RESPONSE = 2,
}

export { ResponseType };