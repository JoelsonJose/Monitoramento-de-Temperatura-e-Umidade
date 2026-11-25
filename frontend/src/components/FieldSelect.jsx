import * as Label from '@radix-ui/react-label';
import * as Select from '@radix-ui/react-select';

export function Field({ id, label, children }) {
  return (
    <div className="field">
      <Label.Root className="field-label" htmlFor={id}>{label}</Label.Root>
      {children}
    </div>
  );
}

export function FieldSelect({ id, label, value, onValueChange, options, placeholder = 'Selecione' }) {
  return (
    <div className="field">
      {label ? <Label.Root className="field-label" htmlFor={id}>{label}</Label.Root> : null}
      <Select.Root value={value} onValueChange={onValueChange}>
        <Select.Trigger id={id} className="select-trigger" type="button" aria-label={label || placeholder}>
          <Select.Value placeholder={placeholder} />
          <Select.Icon aria-hidden="true">▾</Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="select-content" position="popper" sideOffset={6}>
            <Select.Viewport>
              {options.map((option) => (
                <Select.Item key={option.value} value={option.value} className="select-item">
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator>✓</Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
