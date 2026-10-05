<?php
// Run inside Coolify's container as a console-only provisioning operation.
require '/var/www/html/vendor/autoload.php';
$laravel = require '/var/www/html/bootstrap/app.php';
$laravel->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
Illuminate\Support\Facades\Auth::login(App\Models\User::findOrFail(0));
session(['currentTeam' => App\Models\Team::findOrFail(0)]);
$source = App\Models\Application::findOrFail(6);
$sourceDatabase = App\Models\StandalonePostgresql::findOrFail(7);
if ($sourceDatabase->uuid !== 'tg0g6o6y9sgwlxrpgcmy2r5n' || $source->git_branch !== 'main') {
    throw new RuntimeException('Unexpected production resources.');
}
$result = Illuminate\Support\Facades\DB::transaction(function () use ($source, $sourceDatabase) {
    $environment = $source->environment->project->environments()->firstOrCreate(
        ['name' => 'dev'], ['uuid' => (string) new Visus\Cuid2\Cuid2]
    );
    $database = App\Models\StandalonePostgresql::where('name', 'lingowow-dev-db')
        ->where('environment_id', $environment->id)->first();
    if (!$database) {
        $database = $sourceDatabase->replicate(['id', 'created_at', 'updated_at'])->fill([
            'uuid' => (string) new Visus\Cuid2\Cuid2,
            'name' => 'lingowow-dev-db', 'environment_id' => $environment->id,
            'status' => 'exited', 'started_at' => null,
            'postgres_user' => 'lingowow_dev', 'postgres_db' => 'lingowow_dev',
            'postgres_password' => bin2hex(random_bytes(32)),
            'is_public' => false, 'public_port' => null,
        ]);
        $database->save();
    }
    $staging = App\Models\Application::where('name', 'lingowow-dev')
        ->where('environment_id', $environment->id)->first();
    if (!$staging) {
        $staging = clone_application($source, $source->destination, [
            'name' => 'lingowow-dev', 'environment_id' => $environment->id,
            'git_branch' => 'dev', 'git_commit_sha' => 'HEAD',
            'fqdn' => 'https://dev.lingowow.com',
        ], false);
        $staging->scheduled_tasks()->update(['enabled' => false]);
        // Rebuild from an allowlist. No production integration credentials survive.
        $staging->environment_variables()->delete();
        $staging->environment_variables_preview()->delete();
        $url = 'postgresql://'.rawurlencode($database->postgres_user).':'.rawurlencode($database->postgres_password)
            .'@'.$database->uuid.':5432/'.$database->postgres_db;
        $values = [
            'DATABASE_URL' => $url, 'DATABASE_URL_UNPOOLED' => $url,
            'POSTGRES_PRISMA_URL' => $url, 'POSTGRES_URL' => $url,
            'POSTGRES_URL_NON_POOLING' => $url, 'POSTGRES_URL_NO_SSL' => $url,
            'AUTH_URL' => 'https://dev.lingowow.com', 'AUTH_TRUST_HOST' => 'true',
            'NEXT_PUBLIC_DOMAIN' => 'https://dev.lingowow.com',
            'NEXT_PUBLIC_APP_URL' => 'https://dev.lingowow.com',
            'AUTH_SECRET' => bin2hex(random_bytes(32)), 'JWT_SECRET' => bin2hex(random_bytes(32)),
            'CRON_SECRET' => bin2hex(random_bytes(32)), 'NODE_ENV' => 'production',
            'NIXPACKS_NODE_VERSION' => '22', 'NEXT_TELEMETRY_DISABLED' => '1',
            'RESEND_API_KEY' => 're_staging_disabled', 'PAYPAL_CLIENT_ID' => 'staging_disabled',
            'PAYPAL_CLIENT_SECRET' => 'staging_disabled', 'PAYPAL_MODE' => 'sandbox',
            'GEMINI_API_KEY' => 'staging_disabled', 'LINGOFLOW_AI_ENABLED' => 'false',
            'NEXT_PUBLIC_SOCKETIO_URL' => 'https://dev.lingowow.com',
            'SOCKETIO_INTERNAL_URL' => 'http://127.0.0.1:9',
        ];
        foreach ($values as $key => $value) {
            App\Models\EnvironmentVariable::withoutEvents(function () use ($staging, $key, $value) {
                App\Models\EnvironmentVariable::forceCreate([
                    'uuid' => (string) new Visus\Cuid2\Cuid2,
                    'key' => $key, 'value' => $value, 'is_preview' => false,
                    'resourceable_type' => $staging->getMorphClass(), 'resourceable_id' => $staging->id,
                    'is_runtime' => $key !== 'NIXPACKS_NODE_VERSION',
                    'is_buildtime' => str_starts_with($key, 'NEXT_PUBLIC_') || in_array($key, ['NODE_ENV', 'NIXPACKS_NODE_VERSION', 'NEXT_TELEMETRY_DISABLED']),
                ]);
            });
        }
    }
    $staging->settings->update(['is_auto_deploy_enabled' => false, 'is_preview_deployments_enabled' => false]);
    $staging->fqdn = 'https://dev.lingowow.com';
    $staging->custom_labels = base64_encode(implode("\n", generateLabelsApplication($staging)));
    $staging->save();
    return ['app_uuid' => $staging->uuid, 'app_id' => $staging->id,
        'database_uuid' => $database->uuid, 'database_id' => $database->id,
        'environment_uuid' => $environment->uuid];
});
echo json_encode($result)."\n";
