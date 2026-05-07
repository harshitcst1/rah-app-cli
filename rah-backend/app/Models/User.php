<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone_e164',        // added
        'phone_verified_at',
        'city',
        'daily_goal',
        'preferred_mode',
        'privacy_show_initials',
        'privacy_show_city',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'password' => 'hashed',
            'daily_goal' => 'integer',
            'privacy_show_initials' => 'boolean',
            'privacy_show_city' => 'boolean',
            'is_admin' => 'boolean',
        ];
    }

    /**
     * Relationships
     */
    public function logs()
    {
        return $this->hasMany(DaroodLog::class);
    }

    /**
     * Accessors
     */
    public function getPhoneMaskedAttribute(): string
    {
        $phone = $this->phone_e164 ?? '';
        if (empty($phone) || strlen($phone) < 6) {
            return $phone ?: '—';
        }
        // Keep country code and last 2 digits, mask middle
        $cc = substr($phone, 0, 3);
        $last2 = substr($phone, -2);
        return $cc . ' •••• ••' . $last2;
    }
}
