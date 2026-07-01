import {
  isInvalidAttribute,
  isSizeValue,
  isSizeAttributeName,
  isColorAttributeName,
  parseSkuAttributes,
  getAttributePriority,
} from './sku-utils';

describe('sku-utils', () => {
  describe('isInvalidAttribute', () => {
    it('should filter out WhatsApp contact info', () => {
      expect(isInvalidAttribute('WhatsApp', '12345678901')).toBe(true);
      expect(isInvalidAttribute('contact', 'whatsapp: 123')).toBe(true);
    });

    it('should filter out WeChat contact info', () => {
      expect(isInvalidAttribute('微信', 'wx123456')).toBe(true);
      expect(isInvalidAttribute('wechat', 'add me')).toBe(true);
    });

    it('should filter out phone numbers', () => {
      expect(isInvalidAttribute('phone', '13800138000')).toBe(true);
      expect(isInvalidAttribute('size', '12345678901')).toBe(true);
    });

    it('should allow valid attributes', () => {
      expect(isInvalidAttribute('color', 'red')).toBe(false);
      expect(isInvalidAttribute('size', '42')).toBe(false);
      expect(isInvalidAttribute('款式', 'Classic')).toBe(false);
    });
  });

  describe('isSizeValue', () => {
    it('should recognize shoe sizes', () => {
      expect(isSizeValue('36')).toBe(true);
      expect(isSizeValue('36.5')).toBe(true);
      expect(isSizeValue('42')).toBe(true);
      expect(isSizeValue('48')).toBe(true);
    });

    it('should recognize clothing sizes', () => {
      expect(isSizeValue('S')).toBe(true);
      expect(isSizeValue('M')).toBe(true);
      expect(isSizeValue('L')).toBe(true);
      expect(isSizeValue('XL')).toBe(true);
      expect(isSizeValue('XXL')).toBe(true);
      expect(isSizeValue('one size')).toBe(true);
    });

    it('should recognize Chinese height sizes', () => {
      expect(isSizeValue('165码')).toBe(true);
      expect(isSizeValue('170码')).toBe(true);
    });

    it('should recognize length/dimension values', () => {
      expect(isSizeValue('100cm')).toBe(true);
      expect(isSizeValue('105cm(Length)')).toBe(true);
    });

    it('should recognize international size formats', () => {
      expect(isSizeValue('US4')).toBe(true);
      expect(isSizeValue('UK3.5')).toBe(true);
      expect(isSizeValue('EU36')).toBe(true);
      expect(isSizeValue('US4=UK3.5=FR36')).toBe(true);
    });

    it('should not recognize non-size values', () => {
      expect(isSizeValue('red')).toBe(false);
      expect(isSizeValue('blue')).toBe(false);
      expect(isSizeValue('Classic')).toBe(false);
    });
  });

  describe('isSizeAttributeName', () => {
    it('should recognize size attribute names', () => {
      expect(isSizeAttributeName('尺码')).toBe(true);
      expect(isSizeAttributeName('尺寸')).toBe(true);
      expect(isSizeAttributeName('size')).toBe(true);
      expect(isSizeAttributeName('Size')).toBe(true);
      expect(isSizeAttributeName('鞋码')).toBe(true);
      expect(isSizeAttributeName('规格')).toBe(true);
    });

    it('should not recognize non-size attribute names', () => {
      expect(isSizeAttributeName('color')).toBe(false);
      expect(isSizeAttributeName('颜色')).toBe(false);
      expect(isSizeAttributeName('款式')).toBe(false);
    });
  });

  describe('isColorAttributeName', () => {
    it('should recognize color attribute names', () => {
      expect(isColorAttributeName('color')).toBe(true);
      expect(isColorAttributeName('Color')).toBe(true);
      expect(isColorAttributeName('颜色')).toBe(true);
      expect(isColorAttributeName('款式')).toBe(true);
      expect(isColorAttributeName('style')).toBe(true);
    });

    it('should not recognize non-color attribute names', () => {
      expect(isColorAttributeName('size')).toBe(false);
      expect(isColorAttributeName('尺码')).toBe(false);
    });
  });

  describe('parseSkuAttributes', () => {
    it('should return empty object for null/undefined', () => {
      expect(parseSkuAttributes(null)).toEqual({});
      expect(parseSkuAttributes(undefined)).toEqual({});
    });

    it('should return object as-is if already an object', () => {
      const attrs = { color: 'red', size: 'M' };
      expect(parseSkuAttributes(attrs)).toEqual(attrs);
    });

    it('should parse JSON string', () => {
      const jsonStr = '{"color":"red","size":"M"}';
      expect(parseSkuAttributes(jsonStr)).toEqual({ color: 'red', size: 'M' });
    });

    it('should handle double-serialized JSON', () => {
      const doubleJson = '"{\\"color\\":\\"red\\"}"';
      expect(parseSkuAttributes(doubleJson)).toEqual({ color: 'red' });
    });

    it('should return empty object for invalid JSON', () => {
      expect(parseSkuAttributes('invalid json')).toEqual({});
    });
  });

  describe('getAttributePriority', () => {
    it('should prioritize image attributes over non-image', () => {
      expect(getAttributePriority(true, false)).toBeLessThan(
        getAttributePriority(false, false)
      );
    });

    it('should prioritize non-size attributes over size', () => {
      expect(getAttributePriority(false, false)).toBeLessThan(
        getAttributePriority(false, true)
      );
    });

    it('should give highest priority to image non-size attributes', () => {
      expect(getAttributePriority(true, false)).toBe(1);
    });

    it('should give lowest priority to size attributes', () => {
      expect(getAttributePriority(false, true)).toBe(3);
    });
  });
});
