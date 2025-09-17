const ImageResizer = {
  async createResizedImage(
    uri: string,
    width: number,
    height: number,
    ..._rest: unknown[]
  ) {
    void _rest;
    return { uri, width, height };
  }
};
export default ImageResizer;
