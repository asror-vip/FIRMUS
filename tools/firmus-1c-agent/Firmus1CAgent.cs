using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace Firmus1CAgent
{
    public class AgentConfig
    {
        public string ServerUrl { get; set; }
        public string Token { get; set; }
        public string TokenExpiresAt { get; set; }
        public string OutputDir { get; set; }
        public bool AutoSync { get; set; }
    }

    public class MainForm : Form
    {
        private const string AppVersion = "1.0.0";
        private const string DefaultServerUrl = "https://firmusv1.netlify.app";
        private const string DefaultOutputDir = @"C:\FIRMUS_1C";

        private readonly string _configPath;
        private readonly JavaScriptSerializer _json = new JavaScriptSerializer { MaxJsonLength = 16 * 1024 * 1024 };
        private AgentConfig _config;
        private bool _isBusy;

        private Label _lblStatus;
        private TextBox _txtServer;
        private TextBox _txtCode;
        private Button _btnPair;
        private Button _btnDisconnect;
        private TextBox _txtOutDir;
        private Button _btnBrowse;
        private Button _btnOpenDir;
        private Button _btnSyncNow;
        private CheckBox _chkAutoSync;
        private TextBox _txtLog;
        private System.Windows.Forms.Timer _syncTimer;

        public MainForm()
        {
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string cfgDir = Path.Combine(appData, "FIRMUS");
            _configPath = Path.Combine(cfgDir, "1c-agent.json");

            LoadConfig();
            BuildUi();
            RefreshConnectionState();

            if (!string.IsNullOrEmpty(_config.Token) && _config.AutoSync)
            {
                _syncTimer.Start();
                AppendLog("Avto-sinxron yoqilgan (har 60 soniya). Ilova tayyor.");
            }
            else
            {
                AppendLog("FIRMUS 1C Agent ishga tushdi. Ulash uchun saytdan 8-belgili kod oling.");
            }
        }

        private void BuildUi()
        {
            Text = "FIRMUS — 1C Avto-Agent v" + AppVersion;
            Size = new Size(640, 560);
            MinimumSize = new Size(600, 520);
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Color.FromArgb(248, 250, 252);
            Font = new Font("Segoe UI", 9.5f);

            // Top banner
            var header = new Panel
            {
                Dock = DockStyle.Top,
                Height = 62,
                BackColor = Color.FromArgb(15, 23, 42),
                Padding = new Padding(16, 10, 16, 10)
            };

            var lblTitle = new Label
            {
                Text = "FIRMUS — 1C Qoralamalar Agenti",
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 13f, FontStyle.Bold),
                AutoSize = true,
                Location = new Point(16, 10)
            };

            var lblSub = new Label
            {
                Text = "Tasdiqlangan qoralamalarni avtomatik yuklab oladi (provodkasiz / xavfsiz rejim)",
                ForeColor = Color.FromArgb(148, 163, 184),
                Font = new Font("Segoe UI", 8.5f),
                AutoSize = true,
                Location = new Point(16, 36)
            };

            _lblStatus = new Label
            {
                Text = "Ulanmagan",
                ForeColor = Color.White,
                BackColor = Color.FromArgb(100, 116, 139),
                Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter,
                Size = new Size(110, 26),
                Anchor = AnchorStyles.Top | AnchorStyles.Right,
                Location = new Point(500, 18)
            };

            header.Controls.Add(lblTitle);
            header.Controls.Add(lblSub);
            header.Controls.Add(_lblStatus);
            Controls.Add(header);

            // Main container
            var body = new Panel
            {
                Dock = DockStyle.Fill,
                Padding = new Padding(16)
            };
            Controls.Add(body);
            body.BringToFront();

            // Group 1: Connection
            var grpConn = new GroupBox
            {
                Text = "1. FIRMUS hisobiga ulash",
                Location = new Point(16, 12),
                Size = new Size(590, 130),
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };

            var lblServer = new Label { Text = "Server manzili:", Location = new Point(14, 28), AutoSize = true };
            _txtServer = new TextBox
            {
                Location = new Point(140, 24),
                Size = new Size(430, 25),
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
                Text = _config.ServerUrl
            };

            var lblCode = new Label { Text = "8-belgili ulash kodi:", Location = new Point(14, 64), AutoSize = true };
            _txtCode = new TextBox
            {
                Location = new Point(140, 60),
                Size = new Size(190, 25),
                CharacterCasing = CharacterCasing.Upper,
                Font = new Font("Consolas", 11f, FontStyle.Bold)
            };

            _btnPair = new Button
            {
                Text = "Ulash",
                Location = new Point(342, 58),
                Size = new Size(105, 30),
                BackColor = Color.FromArgb(124, 58, 237),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat
            };
            _btnPair.FlatAppearance.BorderSize = 0;
            _btnPair.Click += BtnPair_Click;

            _btnDisconnect = new Button
            {
                Text = "Ulanishni uzish",
                Location = new Point(455, 58),
                Size = new Size(115, 30),
                BackColor = Color.FromArgb(241, 245, 249),
                ForeColor = Color.FromArgb(185, 28, 28),
                FlatStyle = FlatStyle.Flat
            };
            _btnDisconnect.FlatAppearance.BorderColor = Color.FromArgb(252, 165, 165);
            _btnDisconnect.Click += BtnDisconnect_Click;

            var lblHint = new Label
            {
                Text = "Saytda: Sozlamalar -> Integratsiyalar -> Lokal 1C -> «Ulash kodini olish» tugmasini bosing.",
                ForeColor = Color.FromArgb(100, 116, 139),
                Font = new Font("Segoe UI", 8.2f),
                Location = new Point(14, 98),
                AutoSize = true
            };

            grpConn.Controls.AddRange(new Control[] { lblServer, _txtServer, lblCode, _txtCode, _btnPair, _btnDisconnect, lblHint });
            body.Controls.Add(grpConn);

            // Group 2: Folder & Sync
            var grpSync = new GroupBox
            {
                Text = "2. Qoralamalar papkasi va sinxronizatsiya",
                Location = new Point(16, 152),
                Size = new Size(590, 108),
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };

            var lblDir = new Label { Text = "Saqlash papkasi:", Location = new Point(14, 28), AutoSize = true };
            _txtOutDir = new TextBox
            {
                Location = new Point(140, 24),
                Size = new Size(255, 25),
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
                Text = _config.OutputDir
            };

            _btnBrowse = new Button
            {
                Text = "Tanlash...",
                Location = new Point(402, 23),
                Size = new Size(80, 27),
                Anchor = AnchorStyles.Top | AnchorStyles.Right
            };
            _btnBrowse.Click += BtnBrowse_Click;

            _btnOpenDir = new Button
            {
                Text = "Ochish",
                Location = new Point(488, 23),
                Size = new Size(82, 27),
                Anchor = AnchorStyles.Top | AnchorStyles.Right
            };
            _btnOpenDir.Click += BtnOpenDir_Click;

            _btnSyncNow = new Button
            {
                Text = "Hozir sinxronlash",
                Location = new Point(14, 64),
                Size = new Size(165, 32),
                BackColor = Color.FromArgb(16, 185, 129),
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                FlatStyle = FlatStyle.Flat
            };
            _btnSyncNow.FlatAppearance.BorderSize = 0;
            _btnSyncNow.Click += BtnSyncNow_Click;

            _chkAutoSync = new CheckBox
            {
                Text = "Avto-sinxron (har 60 soniyada yangi qoralamalarni tekshirish)",
                Location = new Point(195, 69),
                AutoSize = true,
                Checked = _config.AutoSync
            };
            _chkAutoSync.CheckedChanged += ChkAutoSync_CheckedChanged;

            grpSync.Controls.AddRange(new Control[] { lblDir, _txtOutDir, _btnBrowse, _btnOpenDir, _btnSyncNow, _chkAutoSync });
            body.Controls.Add(grpSync);

            // Group 3: Log
            var lblLog = new Label
            {
                Text = "3. Ish jurnali (har bir qadam shu yerda koʻrinadi):",
                Location = new Point(16, 270),
                AutoSize = true,
                Font = new Font("Segoe UI", 9f, FontStyle.Bold)
            };
            body.Controls.Add(lblLog);

            _txtLog = new TextBox
            {
                Location = new Point(16, 294),
                Size = new Size(590, 175),
                Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right,
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                BackColor = Color.FromArgb(15, 23, 42),
                ForeColor = Color.FromArgb(226, 232, 240),
                Font = new Font("Consolas", 9f)
            };
            body.Controls.Add(_txtLog);

            _syncTimer = new System.Windows.Forms.Timer { Interval = 60000 };
            _syncTimer.Tick += (s, e) =>
            {
                if (!_isBusy && !string.IsNullOrEmpty(_config.Token))
                {
                    StartSyncAsync(true);
                }
            };
        }

        private void LoadConfig()
        {
            _config = new AgentConfig
            {
                ServerUrl = DefaultServerUrl,
                OutputDir = DefaultOutputDir,
                AutoSync = true
            };

            try
            {
                if (File.Exists(_configPath))
                {
                    string raw = File.ReadAllText(_configPath, Encoding.UTF8);
                    var loaded = _json.Deserialize<AgentConfig>(raw);
                    if (loaded != null)
                    {
                        if (!string.IsNullOrWhiteSpace(loaded.ServerUrl)) _config.ServerUrl = loaded.ServerUrl.Trim().TrimEnd('/');
                        if (!string.IsNullOrWhiteSpace(loaded.OutputDir)) _config.OutputDir = loaded.OutputDir.Trim();
                        _config.Token = loaded.Token;
                        _config.TokenExpiresAt = loaded.TokenExpiresAt;
                        _config.AutoSync = loaded.AutoSync;
                    }
                }
            }
            catch
            {
                // Ignore corrupted local config and start with defaults
            }
        }

        private void SaveConfig()
        {
            try
            {
                string dir = Path.GetDirectoryName(_configPath);
                if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }
                string raw = _json.Serialize(_config);
                File.WriteAllText(_configPath, raw, Encoding.UTF8);
            }
            catch (Exception ex)
            {
                AppendLog("Sozlamani saqlashda xato: " + ex.Message);
            }
        }

        private void RefreshConnectionState()
        {
            bool connected = !string.IsNullOrEmpty(_config.Token);
            _lblStatus.Text = connected ? "Ulangan" : "Ulanmagan";
            _lblStatus.BackColor = connected ? Color.FromArgb(16, 185, 129) : Color.FromArgb(100, 116, 139);
            _btnDisconnect.Enabled = connected && !_isBusy;
            _btnSyncNow.Enabled = connected && !_isBusy;
            _btnPair.Enabled = !_isBusy;
        }

        private void SetBusy(bool busy)
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action<bool>(SetBusy), busy);
                return;
            }
            _isBusy = busy;
            RefreshConnectionState();
        }

        private void AppendLog(string message)
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action<string>(AppendLog), message);
                return;
            }
            string line = string.Format("[{0}] {1}", DateTime.Now.ToString("HH:mm:ss"), message);
            if (_txtLog.TextLength > 0) _txtLog.AppendText(Environment.NewLine);
            _txtLog.AppendText(line);
        }

        private void BtnBrowse_Click(object sender, EventArgs e)
        {
            using (var dlg = new FolderBrowserDialog())
            {
                dlg.Description = "1C qoralamalari saqlanadigan papkani tanlang";
                dlg.SelectedPath = Directory.Exists(_txtOutDir.Text) ? _txtOutDir.Text : DefaultOutputDir;
                if (dlg.ShowDialog(this) == DialogResult.OK)
                {
                    _txtOutDir.Text = dlg.SelectedPath;
                    _config.OutputDir = dlg.SelectedPath;
                    SaveConfig();
                    AppendLog("Saqlash papkasi oʻzgartirildi: " + dlg.SelectedPath);
                }
            }
        }

        private void BtnOpenDir_Click(object sender, EventArgs e)
        {
            try
            {
                string dir = string.IsNullOrWhiteSpace(_txtOutDir.Text) ? DefaultOutputDir : _txtOutDir.Text.Trim();
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                Process.Start("explorer.exe", dir);
            }
            catch (Exception ex)
            {
                AppendLog("Papkani ochishda xato: " + ex.Message);
            }
        }

        private void ChkAutoSync_CheckedChanged(object sender, EventArgs e)
        {
            _config.AutoSync = _chkAutoSync.Checked;
            SaveConfig();
            if (_config.AutoSync && !string.IsNullOrEmpty(_config.Token))
            {
                _syncTimer.Start();
                AppendLog("Avto-sinxron yoqildi (har 60 soniya).");
            }
            else
            {
                _syncTimer.Stop();
                AppendLog("Avto-sinxron oʻchirildi.");
            }
        }

        private void BtnDisconnect_Click(object sender, EventArgs e)
        {
            _config.Token = null;
            _config.TokenExpiresAt = null;
            _syncTimer.Stop();
            SaveConfig();
            RefreshConnectionState();
            AppendLog("Lokal ulanish uzildi. Qayta ulash uchun yangi 8-belgili kod kiriting.");
        }

        private void BtnPair_Click(object sender, EventArgs e)
        {
            string serverUrl = _txtServer.Text.Trim().TrimEnd('/');
            string code = _txtCode.Text.Trim();

            if (!serverUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase) &&
                !serverUrl.StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase))
            {
                MessageBox.Show(this, "Server manzili https:// bilan boshlanishi shart.", "FIRMUS", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            if (code.Replace("-", "").Replace(" ", "").Length < 8)
            {
                MessageBox.Show(this, "Saytdan olingan 8-belgili ulash kodini kiriting (masalan: ABCD-2345).", "FIRMUS", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            _config.ServerUrl = serverUrl;
            _config.OutputDir = string.IsNullOrWhiteSpace(_txtOutDir.Text) ? DefaultOutputDir : _txtOutDir.Text.Trim();
            SaveConfig();

            SetBusy(true);
            AppendLog("FIRMUS serveriga ulanilmoqda...");

            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    var payload = new Dictionary<string, object>
                    {
                        { "pairingCode", code },
                        { "baseName", "FIRMUS 1C Agent (" + Environment.MachineName + ")" },
                        { "version", AppVersion }
                    };

                    string respText = HttpPostJson(serverUrl + "/api/1c/pair", _json.Serialize(payload), null);
                    var dict = _json.Deserialize<Dictionary<string, object>>(respText);

                    string token = dict != null && dict.ContainsKey("token") ? Convert.ToString(dict["token"]) : null;
                    string expiresAt = dict != null && dict.ContainsKey("tokenExpiresAt") ? Convert.ToString(dict["tokenExpiresAt"]) : null;

                    if (string.IsNullOrEmpty(token))
                    {
                        AppendLog("Xato: serverdan token qaytmadi.");
                        return;
                    }

                    _config.Token = token;
                    _config.TokenExpiresAt = expiresAt;
                    SaveConfig();

                    BeginInvoke(new Action(() =>
                    {
                        _txtCode.Text = "";
                        RefreshConnectionState();
                        if (_config.AutoSync) _syncTimer.Start();
                    }));

                    AppendLog("Muvaffaqiyatli ulandi! Endi qoralamalar avtomatik yuklab olinadi.");
                    StartSyncAsync(false);
                }
                catch (Exception ex)
                {
                    AppendLog("Ulashda xatolik: " + ex.Message);
                }
                finally
                {
                    SetBusy(false);
                }
            });
        }

        private void BtnSyncNow_Click(object sender, EventArgs e)
        {
            _config.ServerUrl = _txtServer.Text.Trim().TrimEnd('/');
            _config.OutputDir = string.IsNullOrWhiteSpace(_txtOutDir.Text) ? DefaultOutputDir : _txtOutDir.Text.Trim();
            SaveConfig();
            StartSyncAsync(false);
        }

        private void StartSyncAsync(bool isBackgroundTick)
        {
            if (string.IsNullOrEmpty(_config.Token))
            {
                if (!isBackgroundTick) AppendLog("Avval FIRMUS ga ulaning.");
                return;
            }

            SetBusy(true);
            if (!isBackgroundTick) AppendLog("Yangi qoralamalar tekshirilmoqda...");

            string serverUrl = _config.ServerUrl;
            string token = _config.Token;
            string outDir = string.IsNullOrWhiteSpace(_config.OutputDir) ? DefaultOutputDir : _config.OutputDir;

            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    int statusCode;
                    string respText = HttpGetJson(serverUrl + "/api/1c/outbox", token, out statusCode);

                    if (statusCode == 401)
                    {
                        _config.Token = null;
                        SaveConfig();
                        BeginInvoke(new Action(() =>
                        {
                            _syncTimer.Stop();
                            RefreshConnectionState();
                        }));
                        AppendLog("Token muddati tugagan yoki bekor qilingan. Qayta ulash kodi bilan ulaning.");
                        return;
                    }

                    var dict = _json.Deserialize<Dictionary<string, object>>(respText);
                    var items = dict != null && dict.ContainsKey("items") ? dict["items"] as ArrayList : null;

                    if (items == null || items.Count == 0)
                    {
                        if (!isBackgroundTick) AppendLog("Yangi qoralamalar yoʻq.");
                        return;
                    }

                    if (!Directory.Exists(outDir)) Directory.CreateDirectory(outDir);

                    var ackResults = new List<Dictionary<string, object>>();
                    int savedCount = 0;

                    foreach (object rawItem in items)
                    {
                        var item = rawItem as Dictionary<string, object>;
                        if (item == null) continue;

                        string id = GetStr(item, "id");
                        if (string.IsNullOrEmpty(id)) continue;

                        try
                        {
                            string shortId = id.Length > 8 ? id.Substring(0, 8) : id;
                            string stamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                            string jsonFileName = "draft_" + stamp + "_" + shortId + ".json";
                            string jsonFullPath = Path.Combine(outDir, jsonFileName);

                            File.WriteAllText(jsonFullPath, _json.Serialize(item), new UTF8Encoding(false));

                            // Also generate 1CClientBankExchange .txt file for easy 1-click import into 1C
                            string bankTxtName = "1c_import_" + stamp + "_" + shortId + ".txt";
                            string bankTxtPath = Path.Combine(outDir, bankTxtName);
                            string bankContent = BuildClientBankExchange(item);
                            Encoding win1251 = Encoding.GetEncoding(1251);
                            File.WriteAllText(bankTxtPath, bankContent, win1251);

                            ackResults.Add(new Dictionary<string, object>
                            {
                                { "id", id },
                                { "ok", true },
                                { "docNumber", bankTxtName },
                                { "refKey", jsonFullPath }
                            });
                            savedCount++;
                        }
                        catch (Exception itemEx)
                        {
                            ackResults.Add(new Dictionary<string, object>
                            {
                                { "id", id },
                                { "ok", false },
                                { "error", itemEx.Message }
                            });
                        }
                    }

                    if (ackResults.Count > 0)
                    {
                        var ackBody = new Dictionary<string, object> { { "results", ackResults } };
                        HttpPostJson(serverUrl + "/api/1c/ack", _json.Serialize(ackBody), token);
                    }

                    AppendLog(string.Format("{0} ta qoralama «{1}» papkasiga saqlandi va FIRMUS da tasdiqlandi.", savedCount, outDir));
                }
                catch (Exception ex)
                {
                    AppendLog("Sinxronizatsiya xatosi: " + ex.Message);
                }
                finally
                {
                    SetBusy(false);
                }
            });
        }

        private static string GetStr(Dictionary<string, object> d, string key)
        {
            if (d == null || !d.ContainsKey(key) || d[key] == null) return "";
            return Convert.ToString(d[key], CultureInfo.InvariantCulture) ?? "";
        }

        private static string BuildClientBankExchange(Dictionary<string, object> item)
        {
            string docDateRaw = GetStr(item, "docDate");
            string docDateRu = DateTime.Now.ToString("dd.MM.yyyy");
            DateTime parsed;
            if (DateTime.TryParse(docDateRaw, out parsed))
            {
                docDateRu = parsed.ToString("dd.MM.yyyy");
            }

            string amount = GetStr(item, "amount");
            string cpName = GetStr(item, "counterpartyName");
            string cpStir = GetStr(item, "counterpartyStir");
            string desc = GetStr(item, "description");
            string id = GetStr(item, "id");
            string shortNo = id.Length > 6 ? id.Substring(0, 6).ToUpperInvariant() : "1";

            var sb = new StringBuilder();
            sb.AppendLine("1CClientBankExchange");
            sb.AppendLine("ВерсияФормата=1.03");
            sb.AppendLine("Кодировка=Windows");
            sb.AppendLine("Отправитель=FIRMUS 1C Agent");
            sb.AppendLine("Получатель=1С:Бухгалтерия");
            sb.AppendLine("ДатаСоздания=" + DateTime.Now.ToString("dd.MM.yyyy"));
            sb.AppendLine("ВремяСоздания=" + DateTime.Now.ToString("HH:mm:ss"));
            sb.AppendLine("ДатаНачала=" + docDateRu);
            sb.AppendLine("ДатаКонца=" + docDateRu);
            sb.AppendLine("СекцияДокумент=Платежное поручение");
            sb.AppendLine("Номер=" + shortNo);
            sb.AppendLine("Дата=" + docDateRu);
            sb.AppendLine("Сумма=" + amount);
            sb.AppendLine("Плательщик=" + cpName);
            sb.AppendLine("ПлательщикИНН=" + cpStir);
            sb.AppendLine("НазначениеПлатежа=" + desc);
            sb.AppendLine("КонецДокумента");
            sb.AppendLine("КонецФайла");
            return sb.ToString();
        }

        private string HttpGetJson(string url, string bearerToken, out int statusCode)
        {
            var req = (HttpWebRequest)WebRequest.Create(url);
            req.Method = "GET";
            req.Timeout = 20000;
            req.Accept = "application/json";
            req.UserAgent = "FIRMUS-1C-Agent/" + AppVersion;
            if (!string.IsNullOrEmpty(bearerToken))
            {
                req.Headers["Authorization"] = "Bearer " + bearerToken;
            }

            try
            {
                using (var resp = (HttpWebResponse)req.GetResponse())
                {
                    statusCode = (int)resp.StatusCode;
                    using (var sr = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
                    {
                        return sr.ReadToEnd();
                    }
                }
            }
            catch (WebException wex)
            {
                var errResp = wex.Response as HttpWebResponse;
                if (errResp != null)
                {
                    statusCode = (int)errResp.StatusCode;
                    string errBody = ReadResponseBody(errResp);
                    if (statusCode == 401) return errBody;
                    throw new Exception(ExtractServerError(errBody, statusCode));
                }
                throw new Exception("Serverga ulanib boʻlmadi: " + wex.Message);
            }
        }

        private string HttpPostJson(string url, string jsonBody, string bearerToken)
        {
            var req = (HttpWebRequest)WebRequest.Create(url);
            req.Method = "POST";
            req.ContentType = "application/json; charset=utf-8";
            req.Accept = "application/json";
            req.Timeout = 20000;
            req.UserAgent = "FIRMUS-1C-Agent/" + AppVersion;
            if (!string.IsNullOrEmpty(bearerToken))
            {
                req.Headers["Authorization"] = "Bearer " + bearerToken;
            }

            byte[] bytes = Encoding.UTF8.GetBytes(jsonBody);
            req.ContentLength = bytes.Length;
            using (var rs = req.GetRequestStream())
            {
                rs.Write(bytes, 0, bytes.Length);
            }

            try
            {
                using (var resp = (HttpWebResponse)req.GetResponse())
                using (var sr = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
                {
                    return sr.ReadToEnd();
                }
            }
            catch (WebException wex)
            {
                var errResp = wex.Response as HttpWebResponse;
                if (errResp != null)
                {
                    int code = (int)errResp.StatusCode;
                    string errBody = ReadResponseBody(errResp);
                    throw new Exception(ExtractServerError(errBody, code));
                }
                throw new Exception("Serverga ulanib boʻlmadi: " + wex.Message);
            }
        }

        private static string ReadResponseBody(HttpWebResponse resp)
        {
            try
            {
                using (var sr = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
                {
                    return sr.ReadToEnd();
                }
            }
            catch
            {
                return "";
            }
        }

        private string ExtractServerError(string body, int statusCode)
        {
            try
            {
                var dict = _json.Deserialize<Dictionary<string, object>>(body);
                if (dict != null && dict.ContainsKey("error") && dict["error"] != null)
                {
                    return Convert.ToString(dict["error"]);
                }
            }
            catch
            {
                // fallback below
            }
            return "HTTP " + statusCode;
        }

        [STAThread]
        public static int Main(string[] args)
        {
            // Enforce TLS 1.2 for HTTPS requests on all Windows 10/11 machines
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072 | SecurityProtocolType.Tls12;

            if (args != null && args.Length > 0 &&
                (args[0].Equals("--version", StringComparison.OrdinalIgnoreCase) ||
                 args[0].Equals("--check", StringComparison.OrdinalIgnoreCase)))
            {
                return 0;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
            return 0;
        }
    }
}
