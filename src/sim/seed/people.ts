// Mock customers: mixed Gulf, South Asian and expat names, UAE plates and mobiles, BMW-group vehicles.
import type { Customer } from '@/domain/types';
import { intBetween, pickOne, type Rng } from '../rng';

const FIRST = [
  'Aisha', 'Khalid', 'Fatima', 'Mohammed', 'Noor', 'Hamdan', 'Mariam', 'Saeed', 'Latifa', 'Rashid',
  'Hessa', 'Sultan', 'Amna', 'Yousef', 'Reem', 'Majid', 'Priyanka', 'Arjun', 'Deepa', 'Rahul',
  'Sanjay', 'Kavya', 'Imran', 'Ayesha', 'Bilal', 'Zara', 'Chloe', 'James', 'Sophie', 'Lucas',
  'Emma', 'Oliver', 'Anna', 'Mateo', 'Isabella', 'Liam', 'Elif', 'Omar', 'Sara', 'Hana',
  'Tariq', 'Leila', 'Nikhil', 'Meera', 'Daniel', 'Grace', 'Ivan', 'Olga', 'Kenji', 'Mei',
] as const;

const LAST = [
  'Khan', 'Al Hashimi', 'Haddad', 'Al Mansoori', 'Al Falasi', 'Al Suwaidi', 'Al Nuaimi', 'Karimi', 'Rahman', 'Siddiqui',
  'Sharma', 'Patel', 'Iyer', 'Menon', 'Reddy', 'Nair', 'Qureshi', 'Malik', 'Smith', 'Brown',
  'Taylor', 'Martin', 'Rossi', 'Moreau', 'Novak', 'Kowalski', 'Ibrahim', 'Saleh', 'Farouk', 'Aziz',
  'Al Ketbi', 'Al Shamsi', 'Yilmaz', 'Petrov', 'Tanaka', 'Wong', 'Fernandes', 'Costa', 'Silva', 'Mendes',
] as const;

const VEHICLES: Readonly<Record<string, readonly string[]>> = {
  BMW: ['X5 xDrive40i', 'X6 M60i', 'X7 xDrive40i', '530i', '740Li', 'X3 xDrive30i', '320i', 'M4 Competition', 'X1 sDrive20i', '840i Gran Coupé'],
  MINI: ['Cooper S', 'Countryman S ALL4', 'Cooper SE', 'John Cooper Works', 'Clubman S', 'Aceman E'],
  BMWi: ['iX xDrive50', 'i4 eDrive40', 'i7 xDrive60', 'iX3', 'i5 eDrive40', 'iX1 xDrive30'],
};

const EMIRATES = ['Dubai', 'Dubai', 'Dubai', 'Dubai', 'Sharjah', 'Abu Dhabi', 'Ajman'] as const;
const PLATE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'X', 'Y', 'Z'] as const;

export const PRIOR_NOTES = [
  'Customer prefers a call, not SMS.',
  'Last visit: rear brake pads at 40% — recommend replacing.',
  'Extended warranty until 2027.',
  'Courtesy car requested last time.',
  'Tyre pressure warning reported twice.',
  'Recall campaign open: software update.',
  'Pays by corporate account.',
] as const;

export const WALKIN_NOTES = ['', '', '', '', 'Warning light on dashboard', 'Wants a quick wash too', 'Drop-off if long wait', 'Asked for Arabic-speaking advisor'] as const;

export function personName(r: Rng): string {
  return `${pickOne(r, FIRST)} ${pickOne(r, LAST)}`;
}

export function plate(r: Rng): string {
  return `${pickOne(r, EMIRATES)} ${pickOne(r, PLATE_LETTERS)} ${intBetween(r, 10000, 99999)}`;
}

export function mobile(r: Rng): string {
  const prefix = pickOne(r, ['50', '52', '54', '55', '56', '58'] as const);
  return `+971 ${prefix} ${intBetween(r, 100, 999)} ${intBetween(r, 1000, 9999)}`;
}

export function vehicleFor(r: Rng, brand: string): string {
  return pickOne(r, VEHICLES[brand] ?? VEHICLES.BMW ?? ['X5 xDrive40i']);
}

export function makeCustomer(r: Rng, brand: string, opts: { anonymousShare?: number; noMobileShare?: number } = {}): Customer {
  const anonymous = r() < (opts.anonymousShare ?? 0);
  const noMobile = r() < (opts.noMobileShare ?? 0);
  return {
    name: anonymous ? null : personName(r),
    mobile: noMobile ? '' : mobile(r),
    plate: plate(r),
    vehicle: vehicleFor(r, brand),
  };
}
