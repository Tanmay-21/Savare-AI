import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { parseBody, ApiError } from '../lib/validate';

// Accepts both full ISO 8601 ("2026-04-03T14:30:00.000Z") and the
// datetime-local input format ("2026-04-03T14:30") which browsers produce.
// Empty string is normalised to undefined (field not provided).
export const DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

export const FlexibleDatetimeSchema = z
  .string()
  .optional()
  .transform((val) => (val === '' ? undefined : val))
  .refine((val) => val === undefined || DATETIME_RE.test(val), {
    message: 'Invalid datetime format',
  });

export const UpdateShipmentSchema = z.object({
  container_number: z.string().optional(),
  status: z.enum(['pending', 'in-transit', 'delivered', 'cancelled']).optional(),
  vehicle_id: z.string().uuid().optional().nullable(),
  vehicle_number: z.string().optional(),
  driver_id: z.string().uuid().optional().nullable(),
  driver_name: z.string().optional(),
  lr_number: z.string().optional(),
  seal_number: z.string().optional(),
  is_locked: z.boolean().optional(),
  estimated_arrival: FlexibleDatetimeSchema,
  actual_arrival: FlexibleDatetimeSchema,
  remarks: z.string().optional(),
  // Passed by frontend when swapping vehicles — backend handles availability atomically
  previous_vehicle_id: z.string().uuid().optional().nullable(),
});

export default async function handler(req: Request, res: Response) {
  try {
    const user = await requireAuth(req);
    const id = req.params.id;

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') throw new ApiError(404, 'Shipment not found');
        throw error;
      }
      return res.json(data);
    }

    if (req.method === 'PATCH') {
      const updates = parseBody(UpdateShipmentSchema, req.body);

      // Extract vehicle transition fields — not stored on the shipment row
      const { previous_vehicle_id, ...shipmentUpdates } = updates;

      const { data, error } = await supabase
        .from('shipments')
        .update({ ...shipmentUpdates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') throw new ApiError(404, 'Shipment not found');
        throw error;
      }

      // Shipment update succeeded — now manage vehicle availability.
      // Doing this AFTER the shipment update means a vehicle is never stuck
      // unavailable if the shipment update fails.
      let vehicleUpdateFailed = false;
      try {
        const newStatus = shipmentUpdates.status;
        const newVehicleId = shipmentUpdates.vehicle_id;

        // Release previous vehicle when swapping
        if (previous_vehicle_id) {
          await supabase
            .from('vehicles')
            .update({ is_available: true })
            .eq('id', previous_vehicle_id)
            .eq('user_id', user.id);
        }

        if (newStatus === 'in-transit' && newVehicleId) {
          await supabase
            .from('vehicles')
            .update({ is_available: false })
            .eq('id', newVehicleId)
            .eq('user_id', user.id);
        } else if (newStatus === 'delivered') {
          const vehicleId = newVehicleId ?? data.vehicle_id;
          if (vehicleId) {
            await supabase
              .from('vehicles')
              .update({ is_available: true })
              .eq('id', vehicleId)
              .eq('user_id', user.id);
          }
        }
      } catch {
        // Vehicle update failure is non-fatal — shipment is already updated correctly.
        // Signal to the client so it can warn the user to check vehicle status.
        vehicleUpdateFailed = true;
      }

      return res.json({ data, vehicleUpdateFailed });
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
