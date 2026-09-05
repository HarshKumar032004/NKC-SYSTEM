"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var async_hooks_1 = require("async_hooks");
var tenantAls = new async_hooks_1.AsyncLocalStorage();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var basePrisma, prisma, branchA, branchB;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    basePrisma = new client_1.PrismaClient();
                    prisma = basePrisma.$extends({
                        query: {
                            $allModels: {
                                $allOperations: function (_a) {
                                    return __awaiter(this, arguments, void 0, function (_b) {
                                        var context;
                                        var args = _b.args, query = _b.query;
                                        return __generator(this, function (_c) {
                                            switch (_c.label) {
                                                case 0:
                                                    context = tenantAls.getStore();
                                                    if (!(context === null || context === void 0 ? void 0 : context.branchId)) return [3 /*break*/, 2];
                                                    return [4 /*yield*/, basePrisma.$executeRawUnsafe("SET LOCAL app.current_branch_id = '".concat(context.branchId, "'"))];
                                                case 1:
                                                    _c.sent();
                                                    _c.label = 2;
                                                case 2: return [2 /*return*/, query(args)];
                                            }
                                        });
                                    });
                                }
                            }
                        }
                    });
                    return [4 /*yield*/, prisma.$connect()];
                case 1:
                    _a.sent();
                    console.log('Testing RLS policies...');
                    return [4 /*yield*/, basePrisma.branch.upsert({
                            where: { code: 'RLS-A' },
                            update: {},
                            create: { id: 'branch-a', name: 'RLS Branch A', code: 'RLS-A' }
                        })];
                case 2:
                    branchA = _a.sent();
                    return [4 /*yield*/, basePrisma.branch.upsert({
                            where: { code: 'RLS-B' },
                            update: {},
                            create: { id: 'branch-b', name: 'RLS Branch B', code: 'RLS-B' }
                        })];
                case 3:
                    branchB = _a.sent();
                    // Setup mock batches
                    return [4 /*yield*/, basePrisma.batch.upsert({
                            where: { id: 'batch-a' },
                            update: {},
                            create: { id: 'batch-a', name: 'Batch A', branchId: branchA.id }
                        })];
                case 4:
                    // Setup mock batches
                    _a.sent();
                    return [4 /*yield*/, basePrisma.batch.upsert({
                            where: { id: 'batch-b' },
                            update: {},
                            create: { id: 'batch-b', name: 'Batch B', branchId: branchB.id }
                        })];
                case 5:
                    _a.sent();
                    // Test Branch A access
                    return [4 /*yield*/, tenantAls.run({ branchId: branchA.id }, function () { return __awaiter(_this, void 0, void 0, function () {
                            var batches;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.batch.findMany()];
                                    case 1:
                                        batches = _a.sent();
                                        if (batches.some(function (b) { return b.branchId !== branchA.id; })) {
                                            console.error('❌ RLS Test Failed: Branch A accessed Branch B data.');
                                            process.exit(1);
                                        }
                                        console.log('✅ Branch A isolated successfully.');
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 6:
                    // Test Branch A access
                    _a.sent();
                    // Test Branch B access
                    return [4 /*yield*/, tenantAls.run({ branchId: branchB.id }, function () { return __awaiter(_this, void 0, void 0, function () {
                            var batches;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.batch.findMany()];
                                    case 1:
                                        batches = _a.sent();
                                        if (batches.some(function (b) { return b.branchId !== branchB.id; })) {
                                            console.error('❌ RLS Test Failed: Branch B accessed Branch A data.');
                                            process.exit(1);
                                        }
                                        console.log('✅ Branch B isolated successfully.');
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 7:
                    // Test Branch B access
                    _a.sent();
                    // Test SUPER_ADMIN bypass
                    return [4 /*yield*/, tenantAls.run({ bypassRls: true }, function () { return __awaiter(_this, void 0, void 0, function () {
                            var batches, hasBranchA, hasBranchB;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.batch.findMany()];
                                    case 1:
                                        batches = _a.sent();
                                        hasBranchA = batches.some(function (b) { return b.branchId === branchA.id; });
                                        hasBranchB = batches.some(function (b) { return b.branchId === branchB.id; });
                                        if (!hasBranchA || !hasBranchB) {
                                            console.error('❌ RLS Test Failed: SUPER_ADMIN bypass did not return data from all branches.');
                                            process.exit(1);
                                        }
                                        console.log('✅ SUPER_ADMIN bypass validated successfully.');
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 8:
                    // Test SUPER_ADMIN bypass
                    _a.sent();
                    console.log('✅ All RLS Isolation tests passed.');
                    return [4 /*yield*/, basePrisma.$disconnect()];
                case 9:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (e) {
    console.error(e);
    process.exit(1);
});
