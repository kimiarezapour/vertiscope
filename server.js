const http = require('http');
const mysql = require('mysql');
const url = require ('url');
const cors = require ('cors');
const bcrypt = require ('bcrypt');
const jwt = require ('jsonwebtoken');
const { body, validationResult } = require('express-validator');


//تنظیمات اتصال به دیتابیس
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Kk445566@',
    database: 'verticheck'
});


//اتصال به دیتابیس
db.connect(err =>{
    if(err){
        console.error('خطا در اتصال به دیتابیس!' , err);
        return;
    }
    console.log('اتصال موفق به دیتابیس!');
});

//ایجاد سرور
const server = http.createServer((req, res)=> {
    const parsedUrl = url.parse(req.url);
    const path = parsedUrl.pathname;
    const method = req.method;
    

    //تنظیم هدر ها
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Method', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('content-type', 'application/json');
    
   

    if(method === 'OPTIONS'){
        res.writeHead(204);
        res.end();
        return;
    }

    

  
    if(path === '/save-result' && method === 'POST'){
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();

        });

        req.on('end', () => {
            console.log('Recieved body:', body)
         try {
            const data = JSON.parse(body);
            console.log('Parsed data:', data)
            const {patientName, sumFirst19, sumSecond15, patientAge, userId, interpretation} = data;
            
            if(!patientName || !patientAge || !userId){
                res.writeHead(400);
                res.end(JSON.stringify({ status: 'error', message: 'نام بیمار نمیتواند خالی باشد'}));
                return;
            }
            const sql = "INSERT INTO results (patient_name, sum_first_19, sum_second_15, patient_age, user_id, interpretation) VALUES (?, ?, ?, ?, ?, ?)";
            console.log('interpretation from client:', interpretation)
            db.query(sql,[patientName, sumFirst19, sumSecond15, patientAge, userId, interpretation], (err, results)=> {
                if(err){
                    console.error('Error in database:', err);
                    res.writeHead(500);
                    res.end(JSON.stringify({ status: 'error', message:'خطا در ذخیره اطلاعات', error: err.sqlMessage || err}));
                    return;
                }

                res.writeHead(200);
                res.end(JSON.stringify({ status: 'success', message: 'نتیجه با موفقیت ذخیره شد!'}));
            });
         } catch (error) {
            res.writeHead(400);
            res.end(JSON.stringify({ status: 'error', message: 'فرمت داده نادرست'}));
            return;
         }
        
        });
    }
    
    else if (path === '/get-results' && method === 'GET'){
        const patient_id = parsedUrl.query.patient_id;

        if(!patient_id) {
            res.writeHead(400);
            res.end(JSON.stringify({ status: 'error', message: 'شناسه بیمار الزامی است'}));
            return;
        }
        
        
        const sql = "SELECT * FROM results WHERE patient_id = ? ";
        db.query(sql, [patient_id], (err, results) => {
            if (err){
                res.writeHead(500);
                res.end(JSON.stringify({ status: 'error', message: '!خطا در دریافت اطلاعات'}));
                return;
            }
            res.writeHead(200);
            res.end(JSON.stringify({ status: 'success', data: results}));
        });
    }
   
    else if (path === '/register' && method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { username, phoneNumber, password, role } = JSON.parse(body);

                console.log("Received data:", { username, phoneNumber, password, role});


                if (!username ||  !phoneNumber ||  !password || !role) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ status: 'error', message: 'تمام فیلدها باید پر شوند' }));
                    return;
                }
                  // اضافه کردن اعتبارسنجی شماره تلفن و رمز عبور
            const phoneRegex = /^[0-9]{10,15}$/;
            if (!phoneRegex.test(phoneNumber)) {
                res.writeHead(400);
                res.end(JSON.stringify({ status: 'error', message: 'شماره تلفن باید فقط عدد و بین ۱۰ تا ۱۵ رقم باشد' }));
                return;
            }

            if (password.length < 4) {
                res.writeHead(400);
                res.end(JSON.stringify({ status: 'error', message: 'رمز عبور باید حداقل ۴ کاراکتر باشد' }));
                return;
            }
    
                const checkUserSql = "SELECT * FROM mainusers WHERE username = ? OR phone = ?";
                db.query(checkUserSql, [username, phoneNumber], async (err, results) => {
                    if (err) {
                        res.writeHead(500);
                        res.end(JSON.stringify({ status: 'error', message: 'خطا در بررسی کاربر' }));
                        return;
                    }
                    if (results.length > 0) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ status: 'error', message: 'نام کاربری یا شماره قبلاً ثبت شده' }));
                        return;
                    }
    
                    const hashedPassword = await bcrypt.hash(password, 10);
                    const insertSql = "INSERT INTO mainusers (username, phone, password, role) VALUES (?, ?, ?, ?)";
                    db.query(insertSql, [username, phoneNumber, hashedPassword, role], (err, result) => {
                        if (err) {
                            console.error('خطا در ثبت نام :', err)
                            res.writeHead(500);
                            res.end(JSON.stringify({ success: false , message: 'خطا در ثبت‌ نام' }));
                            return;
                        }
                        console.log("ثبت نام موفق !");
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({ success: true , message: 'کاربر با موفقیت ثبت شد' }));
                    });
                });
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ status: 'error', message: 'فرمت داده نادرست' }));
            }
        });
    }
    
    //مسیر ورود کاربران
    else if (path === '/login' && method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { username, phoneNumber, password } = JSON.parse(body);
                if (!username || !phoneNumber || !password) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ status: 'error', message: 'تمام فیلدها باید پر شوند' }));
                    return;
                }
    
                // اضافه کردن اعتبارسنجی شماره تلفن و رمز عبور در لاگین هم
                const phoneRegex = /^[0-9]{10,15}$/;
                if (!phoneRegex.test(phoneNumber)) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ status: 'error', message: 'شماره تلفن باید فقط عدد و بین ۱۰ تا ۱۵ رقم باشد' }));
                    return;
                }
    
                if (password.length < 4) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ status: 'error', message: 'رمز عبور باید حداقل ۴ کاراکتر باشد' }));
                    return;
                }
                const sql = "SELECT * FROM mainusers WHERE username = ? AND phone = ? ";
                db.query(sql, [username, phoneNumber], async (err, results) => {
                    if (err) {
                        res.writeHead(500);
                        res.end(JSON.stringify({ status: 'error', message: 'خطا در دریافت اطلاعات' }));
                        return;
                    }
                    if (results.length === 0) {
                        res.writeHead(401);
                        res.end(JSON.stringify({ status: 'error', message: 'کاربر یافت نشد' }));
                        return;
                    }
    
                    const user = results[0];
                    const match = await bcrypt.compare(password, user.password);
                    if (!match) {
                        res.writeHead(401);
                        res.end(JSON.stringify({ status: 'error', message: 'رمز عبور اشتباه است' }));
                        return;
                    }
    
                    const token = jwt.sign({ id: user.id, role: user.role }, "secret_key", { expiresIn: "1h" });
                    console.log("Sending Response:", {
                        username: user.username,
                        phoneNumber: user.phone,
                        token
                    
                    });
                    res.writeHead(200);
                    res.end(JSON.stringify({ status: 'success', token, role: user.role, user_id: user.id, username: user.username, phoneNumber: user.phone}));
                });
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ status: 'error', message: 'فرمت داده نادرست' }));
            }
        });
    }


   
    else if (path === '/get-patients' && method === 'GET') {
        const querystring = require('querystring');
        const query = querystring.parse(parsedUrl.query);
        const userId = query.user_id;
    
        if (!userId) {
            res.writeHead(400);
            res.end(JSON.stringify({ status: 'error', message: 'user_id ارسال نشده' }));
            return;
        }
    
        const sql = "SELECT patient_name, patient_age, sum_first_19 AS sumFirst19, sum_second_15 AS sumSecond15 FROM results WHERE user_id = ?";
        db.query(sql, [userId], (err, results) => {
            if (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ status: 'error', message: 'خطا در دریافت بیماران', error: err }));
                return;
            }
    
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', data: results }));
        });
    }
    else {
        res.writeHead(404);
        res.end(JSON.stringify({ status: ' error', message:'مسیر نامعتبر'}));
    }
});
 
 
server.listen(3000, () => {
    console.log('3000 سرور در حال اجرا روی پورت');
});