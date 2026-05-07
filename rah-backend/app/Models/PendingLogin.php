<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PendingLogin extends Model
{
    use HasUuids;

    protected $table = 'pending_logins';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'phone_e164',
        'otp_hash',
        'otp_expires_at',
        'otp_attempts',
        'sends_count',
        'last_otp_sent_at',
        'locked_until',
    ];

    protected $casts = [
        'otp_expires_at'   => 'datetime',
        'last_otp_sent_at' => 'datetime',
        'locked_until'     => 'datetime',
    ];
}