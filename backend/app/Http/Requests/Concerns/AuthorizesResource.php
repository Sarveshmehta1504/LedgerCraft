<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Database\Eloquent\Model;

/**
 * Runs the policy check before the validation rules.
 *
 * A FormRequest authorizes first and validates second, but a controller that
 * calls $this->authorize() in its own body does the opposite: the rules have
 * already run by the time the method is entered. That ordering leaks. An
 * accountant posting to /accounts got "this code is already taken" - a fact
 * about data they are not allowed to read - instead of a flat 403, and a portal
 * account could map out which login IDs and account codes exist by watching
 * 422 answers come back where 403 belonged.
 *
 * Putting the check here fixes the order for every request that carries a body.
 * The controllers keep their own authorize() calls: those still cover index,
 * show, destroy, archive, post and confirm, which have no FormRequest at all,
 * and a second identical check costs nothing.
 */
trait AuthorizesResource
{
    public function authorize(): bool
    {
        $existing = $this->routeModel();

        // A bound model means this is an update; its absence means a create.
        return $existing !== null
            ? (bool) $this->user()?->can($this->updateAbility(), $existing)
            : (bool) $this->user()?->can('create', $this->resourceModel());
    }

    /**
     * The model the route is bound to, or null when the route has none.
     *
     * Read by name rather than by taking the first parameter, because a nested
     * route ("this invoice's payments") binds a model that is not the subject
     * of the request.
     */
    protected function routeModel(): ?Model
    {
        foreach ($this->routeParameters() as $name) {
            $value = $this->route($name);

            if ($value instanceof Model) {
                return $value;
            }
        }

        return null;
    }

    /** Overridden where editing is not the ability being asked for. */
    protected function updateAbility(): string
    {
        return 'update';
    }

    /**
     * Route parameter names that may hold this request's model.
     *
     * @return array<int, string>
     */
    abstract protected function routeParameters(): array;

    /** Class name the `create` ability is checked against. */
    abstract protected function resourceModel(): string;
}
