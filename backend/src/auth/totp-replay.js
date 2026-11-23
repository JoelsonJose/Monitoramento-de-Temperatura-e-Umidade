export async function consumeTotpStep(db, username, step) {
  if (
    !db ||
    typeof username !== 'string' ||
    !username ||
    !Number.isSafeInteger(step) ||
    step < 0
  ) {
    return false;
  }

  const result = await db.query(
    `UPDATE users
     SET otp_last_step = $2
     WHERE username = $1
       AND otp_enabled = TRUE
       AND (otp_last_step IS NULL OR otp_last_step < $2)
     RETURNING username`,
    [username, step]
  );

  return result.rowCount === 1;
}
