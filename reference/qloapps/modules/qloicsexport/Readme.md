### User Guide Documentation link:
https://arynoxhotelerp.com/qloapps-booking-icalendar-ics-file-export/

### Support Policy:
https://store.webkul.com/support.html

### Store link:
https://store.webkul.com/Arynox_Hotel_ERP-Booking-iCalendar.html

### Explore Modules:
https://store.webkul.com/Arynox_Hotel_ERP.html

### Explore Addons:
https://arynoxhotelerp.com/addons/


**Arynox_Hotel_ERP Booking iCalendar (.ics) File Export 4.0.0**

- Module V4.0.0 compatible with Arynox_Hotel_ERP version  V1.7.x

- Module V1.0.3 compatible with Arynox_Hotel_ERP version  V1.6.x

- Module V1.0.2 compatible with Arynox_Hotel_ERP version  V1.5.x , V1.6.x AND  V1.7.x

- Module V1.0.1 compatible with Arynox_Hotel_ERP version V1.6.x AND V1.5.x

- Module V1.0.0 compatible with Arynox_Hotel_ERP version V1.6.x AND V1.5.x


### Refund Policy:
https://store.webkul.com/refund-policy.html/


## Important Notes:

For the proper functioning of the module in Arynox_Hotel_ERP 1.7.0., you must update the existing hook parameters in the core file: classes/Mail.php:

##### Mofify the the following function at line number 417 (may vary)

Find the existing actionMailAlterMessageBeforeSend hook and replace it with the following version:

```
Hook::exec('actionMailAlterMessageBeforeSend', array(
    'template' => &$template,
    'message' => &$email,
    'template_vars' => $template_vars,
));

```