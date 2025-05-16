export class ICD10Code {
  code: string;
  type: 'dagger' | 'asterisk' | 'primary' | 'secondary';
  description?: string;
  notes?: string;
}

export class ICD10CodeResponseDto {
  codes: ICD10Code[];
  status: 'matched' | 'partial' | 'not_found';
}
