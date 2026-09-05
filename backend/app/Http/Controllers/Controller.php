<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

abstract class Controller
{
    // Laravel 11+ no longer includes this by default, but every API controller
    // calls $this->authorize() against a policy.
    use AuthorizesRequests;
}
