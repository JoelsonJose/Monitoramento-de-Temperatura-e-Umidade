import * as AlertDialog from '@radix-ui/react-alert-dialog';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  busy = false,
  onOpenChange,
  onConfirm,
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="confirm-content">
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description>{description}</AlertDialog.Description>
          <div className="modal-actions">
            <AlertDialog.Cancel className="btn-cancel-modal" disabled={busy}>Cancelar</AlertDialog.Cancel>
            <AlertDialog.Action
              className={destructive ? 'btn-confirm-del' : 'btn-save-modal'}
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                onConfirm();
              }}
            >
              {busy ? 'Aguarde…' : confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
