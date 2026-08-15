## Overview

The **Arynox_Hotel_ERP Cron Task Manager** module enables centralized management and execution of scheduled (cron) tasks within Arynox_Hotel_ERP. It allows developers and administrators to define, register, and execute automated jobs efficiently.

**Arynox_Hotel_ERP Cron Task Manager 1.0.0** 

- Current version: 1.0.0 

- Module V1.0.0 compatible with Arynox_Hotel_ERP version 1.7.0 and V1.8.x.



## Usage (Arynox_Hotel_ERP version 1.7.0)

To register a cron task, add a new hook inside your module's main class file.

### Step 1: Register Cron Tasks Hook

```php
public function hookRegisterCronTasks()
{
    return array(
        array(
            'name' => 'cron_success_probe',
            'description' => $this->l('Sample cron task for scheduler verification.'),
            'cron' => '* * * * *',
            'callback' => 'cronSuccessProbe',
        )
    );
}

```

### Support Policy:
https://store.webkul.com/support.html


### Explore Addons:
https://arynoxhotelerp.com/addons/

### Refund Policy:
https://store.webkul.com/refund-policy.html/