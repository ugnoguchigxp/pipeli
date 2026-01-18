import { describe, expect, it } from 'bun:test';
import {
    anonymize,
    generalizeAge,
    generalizeDate,
    generalizePostalCode,
    hashValue,
    hmacValue,
    maskValue,
} from './anonymizer';

describe('hashValue', () => {
    it('同じ値は同じハッシュになる', () => {
        const hash1 = hashValue('patient-123');
        const hash2 = hashValue('patient-123');
        expect(hash1).toBe(hash2);
    });

    it('異なる値は異なるハッシュになる', () => {
        const hash1 = hashValue('patient-123');
        const hash2 = hashValue('patient-456');
        expect(hash1).not.toBe(hash2);
    });

    it('ソルト付きでハッシュ化できる', () => {
        const hash1 = hashValue('patient-123', 'salt1');
        const hash2 = hashValue('patient-123', 'salt2');
        expect(hash1).not.toBe(hash2);
    });
});

describe('hmacValue', () => {
    it('HMAC-SHA256でハッシュ化できる', () => {
        const hmac = hmacValue('patient-123', 'secret-key');
        expect(hmac).toHaveLength(64); // SHA256 hex = 64文字
    });
});

describe('maskValue', () => {
    it('最初の1文字を保持', () => {
        const result = maskValue('田中太郎', { field: '', keep: 'first1', maskChar: '*' });
        expect(result).toBe('田***');
    });

    it('最後の4文字を保持', () => {
        const result = maskValue('090-1234-5678', { field: '', keep: 'last4', maskChar: '*' });
        expect(result).toBe('*********5678');
    });

    it('ドメインを保持', () => {
        const result = maskValue('user@example.com', { field: '', keep: 'domain', maskChar: '*' });
        expect(result).toBe('****@example.com');
    });

    it('全てマスク', () => {
        const result = maskValue('secret', { field: '', keep: 'none', maskChar: 'X' });
        expect(result).toBe('XXXXXX');
    });
});

describe('generalizeAge', () => {
    it('年齢を10歳刻みで一般化', () => {
        expect(generalizeAge(25)).toBe('20-29');
        expect(generalizeAge(0)).toBe('0-9');
        expect(generalizeAge(99)).toBe('90-99');
    });

    it('カスタム範囲で一般化', () => {
        const ranges = [0, 18, 65, 100];
        expect(generalizeAge(10, ranges)).toBe('0-17');
        expect(generalizeAge(30, ranges)).toBe('18-64');
        expect(generalizeAge(70, ranges)).toBe('65-99');
    });

    it('100歳以上は「100+」', () => {
        expect(generalizeAge(105)).toBe('100+');
    });

    it('不正な値はunknownになる', () => {
        expect(generalizeAge(Number.NaN)).toBe('unknown');
        expect(generalizeAge('25' as unknown as number)).toBe('unknown');
    });
});

describe('generalizeDate', () => {
    it('年に一般化', () => {
        expect(generalizeDate('1990-05-15', 'year')).toBe('1990');
    });

    it('月に一般化', () => {
        expect(generalizeDate('1990-05-15', 'month')).toBe('1990-05');
    });

    it('Dateオブジェクトを処理', () => {
        const date = new Date('1990-05-15');
        expect(generalizeDate(date, 'year')).toBe('1990');
    });

    it('不正な日付はunknownになる', () => {
        expect(generalizeDate('not-a-date', 'year')).toBe('unknown');
    });
});

describe('generalizePostalCode', () => {
    it('上位3桁を保持', () => {
        expect(generalizePostalCode('100-0001')).toBe('100-XXXX');
    });

    it('カスタム桁数を保持', () => {
        expect(generalizePostalCode('100-0001', 5)).toBe('10000-XXXX');
    });

    it('桁数が小さい場合は1桁に丸める', () => {
        expect(generalizePostalCode('100-0001', 0)).toBe('1-XXXX');
        expect(generalizePostalCode('100-0001', -2)).toBe('1-XXXX');
    });
});

describe('anonymize', () => {
    it('複合匿名化を実行', () => {
        const result = anonymize({
            data: {
                patient_id: '12345',
                name: '田中太郎',
                phone: '090-1234-5678',
                age: 25,
                ssn: '123-45-6789',
            },
            config: {
                hash: ['patient_id'],
                mask: [{ field: 'phone', keep: 'last4', maskChar: '*' }],
                generalizeAge: { field: 'age' },
                redact: ['ssn'],
            },
        });

        expect(result.patient_id).toHaveLength(64); // ハッシュ化
        expect(result.phone).toBe('*********5678'); // マスク
        expect(result.age).toBe('20-29'); // 年齢一般化
        expect(result.ssn).toBeUndefined(); // 削除
        expect(result.name).toBe('田中太郎'); // 変更なし
    });

    it('許可リストでフィルタ', () => {
        const result = anonymize({
            data: {
                id: '123',
                name: '田中',
                secret: 'password',
            },
            config: {
                allowlist: ['id', 'name'],
            },
        });

        expect(result.id).toBe('123');
        expect(result.name).toBe('田中');
        expect(result.secret).toBeUndefined();
    });
});
