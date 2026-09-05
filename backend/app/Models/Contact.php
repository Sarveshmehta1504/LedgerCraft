<?php

namespace App\Models;

use App\Models\Concerns\HasArchive;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contact extends Model
{
    use HasArchive, HasFactory;

    protected $fillable = [
        'name',
        'type',
        'email',
        'mobile',
        'address_street',
        'address_city',
        'address_state',
        'address_country',
        'address_pin',
        'profile_image',
    ];

    protected function casts(): array
    {
        return ['archived_at' => 'datetime'];
    }

    /** Portal accounts linked to this contact. */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
