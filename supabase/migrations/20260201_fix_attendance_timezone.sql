
-- Change attendance columns to TIMESTAMP WITHOUT TIME ZONE
-- This allows storing the device's local IST time directly without conversion issues
ALTER TABLE attendance 
  ALTER COLUMN check_in TYPE TIMESTAMP WITHOUT TIME ZONE;

-- Comment describing the change
COMMENT ON COLUMN attendance.check_in IS 'Stores the device local time (IST) as received from eSSL/ADMS';
