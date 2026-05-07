<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * PendingRegistration holds pre-user data and OTP state before final user creation.
 */
class PendingRegistration extends Model
{
    protected $table = 'pending_registrations';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'name',
        'email',
        'raw_phone',
        'phone_e164',
        'city',
        'password_hash',
        'otp_hash',
        'otp_expires_at',
        'otp_attempts',
        'sends_count',
        'last_otp_sent_at',
        'locked_until',
    ];

    protected $casts = [
        'otp_expires_at' => 'datetime',
        'last_otp_sent_at' => 'datetime',
        'locked_until' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }
}